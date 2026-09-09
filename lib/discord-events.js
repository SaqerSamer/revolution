'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const DAY = 24 * 60 * 60 * 1000;

function stripMentions(value) {
  return String(value || '')
    .replace(/<@(?:!|&)?\d+>|<#\d+>/g, '')
    .replace(/(?<![\p{L}\p{N}_./:])@[\p{L}\p{N}_-]+/gu, '')
    .replace(/<a?:([\w]+):\d+>/g, ':$1:')
    .replace(/[\t ]+\n/g, '\n').replace(/[\t ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function imageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}

function fromMessage(message, channelId, now = Date.now()) {
  if (!/^\d+$/.test(message.id || '') || (message.channel_id && message.channel_id !== channelId)) return null;
  // Announcements, ordinary messages, replies and forwarded posts; omit Discord system notices.
  if (![0, 19, undefined].includes(message.type)) return null;
  const published = Date.parse(message.timestamp);
  if (!Number.isFinite(published) || published > now || published + DAY <= now) return null;
  const parts = [stripMentions(message.content)];
  const images = [];
  for (const attachment of message.attachments || []) {
    if (!/^image\//.test(attachment.content_type || '') && !/\.(png|jpe?g|gif|webp|avif)$/i.test(attachment.filename || '')) continue;
    const url = imageUrl(attachment.url);
    if (url) images.push(url);
  }
  for (const embed of message.embeds || []) {
    // Rich embeds can be the entire announcement. Link previews must not duplicate the post.
    if (embed.type === 'rich') {
      parts.push(stripMentions(embed.title), stripMentions(embed.description));
      for (const field of embed.fields || []) parts.push(stripMentions(field.name), stripMentions(field.value));
    }
    const url = imageUrl(embed.image?.proxy_url || embed.image?.url);
    if (url) images.push(url);
  }
  const description = parts.filter(Boolean).join('\n\n');
  if (!description && !images.length) return null;
  return {
    id: `discord-${message.id}`, source: 'discord', description,
    images: [...new Set(images)], publishedAt: new Date(published).toISOString(),
    expiresAt: new Date(published + DAY).toISOString()
  };
}

class DiscordEventFeed {
  constructor({ channelId, filePath, api, onChange = () => {}, now = Date.now, prepareEvents = async events => events }) {
    Object.assign(this, { channelId, filePath, api, onChange, now, prepareEvents });
    this.events = []; this.busy = false; this.running = false; this.retryAt = 0;
    this.status = { channelId, lastSyncAt: null, error: null };
    try {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (saved.channelId === channelId && Array.isArray(saved.events)) {
        this.events = saved.events.filter(event => Number.isFinite(Date.parse(event.expiresAt)) && Date.parse(event.expiresAt) > now());
      }
    } catch (error) { if (error.code !== 'ENOENT') console.warn('Discord event cache unavailable:', error.message); }
  }
  snapshot() {
    const events = this.events.filter(event => Date.parse(event.expiresAt) > this.now());
    return { discordEvents: events, discordEventsRevision: createHash('sha256').update(JSON.stringify(events)).digest('hex'), serverTime: new Date(this.now()).toISOString() };
  }
  replace(events) {
    events.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.id.localeCompare(a.id));
    if (JSON.stringify(events) === JSON.stringify(this.events)) { this.scheduleExpiry(); return; }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(`${this.filePath}.tmp`, JSON.stringify({ channelId: this.channelId, events }));
    fs.renameSync(`${this.filePath}.tmp`, this.filePath);
    this.events = events;
    this.scheduleExpiry();
    this.onChange();
  }
  expire() { this.replace(this.events.filter(event => Date.parse(event.expiresAt) > this.now())); }
  scheduleExpiry() {
    clearTimeout(this.expiryTimer);
    if (!this.running || !this.events.length) return;
    const next = Math.min(...this.events.map(event => Date.parse(event.expiresAt)));
    this.expiryTimer = setTimeout(() => {
      try { this.expire(); } catch (error) { console.warn('Discord event expiry:', error.message); }
    }, Math.max(1, next - this.now()));
    this.expiryTimer.unref?.();
  }
  async sync() {
    if (this.busy || this.now() < this.retryAt) return;
    this.busy = true;
    try {
      const events = new Map();
      let before;
      // Read all posts from the last day, including any missed during a restart.
      for (;;) {
        const messages = await this.api(`/channels/${this.channelId}/messages?limit=100${before ? `&before=${before}` : ''}`);
        if (!Array.isArray(messages)) throw new Error('Unexpected Discord response');
        for (const message of messages) {
          const event = fromMessage(message, this.channelId, this.now());
          if (event) events.set(event.id, event);
        }
        const oldest = messages[messages.length - 1];
        if (messages.length < 100 || !oldest || Date.parse(oldest.timestamp) <= this.now() - DAY) break;
        if (before === oldest.id) throw new Error('Discord history pagination did not advance');
        before = oldest.id;
      }
      this.replace(await this.prepareEvents([...events.values()]));
      this.status.lastSyncAt = new Date(this.now()).toISOString();
      this.status.error = null; this.failures = 0; this.retryAt = 0;
    } catch (error) {
      this.status.error = error.status === 403 ? 'Channel read permission is missing' : 'Discord synchronization temporarily unavailable';
      this.failures = (this.failures || 0) + 1;
      this.retryAt = this.now() + Math.max(error.retryAfterMs || 0, Math.min(300000, 30000 * 2 ** Math.min(this.failures - 1, 4)));
      console.warn('Discord event sync:', error.message);
    } finally { this.busy = false; }
  }
  requestSync() {
    // Message bursts collapse into one refresh; the regular poll repairs missed gateway events.
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.sync(), 350);
    this.refreshTimer.unref?.();
  }
  start() {
    this.running = true; this.scheduleExpiry(); this.sync();
    this.pollTimer = setInterval(() => this.sync(), 30000);
    this.pollTimer.unref?.();
  }
  stop() {
    this.running = false;
    clearTimeout(this.refreshTimer); clearTimeout(this.expiryTimer); clearInterval(this.pollTimer);
  }
}
module.exports = { DAY, stripMentions, fromMessage, DiscordEventFeed };
