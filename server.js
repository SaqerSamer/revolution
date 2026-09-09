const http = require('http');
const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');
const { sendStatic, sendPage } = require('./lib/http-assets');
const { DiscordEventFeed } = require('./lib/discord-events');
const { EventImageCache } = require('./lib/event-images');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!key || process.env[key]) continue;

    process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 20000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = __dirname;
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const DATA_DIR = path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.SITE_DATA_DIR || path.join(__dirname, 'data'));
const SITE_DATA_PATH = path.join(DATA_DIR, 'site-control.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BUNDLED_SITE_DATA_PATH = path.join(__dirname, 'data', 'site-control.json');
const DISCORD_BOT_TOKEN = String(process.env.DISCORD_BOT_TOKEN || '').trim();
const DISCORD_GUILD_ID = String(process.env.DISCORD_GUILD_ID || '1506948630903521290').trim();
const DISCORD_EVENTS_CHANNEL_ID = String(process.env.DISCORD_EVENTS_CHANNEL_ID || '1507830430987194460').trim();
const DISCORD_FEEDBACK_CHANNEL_ID = String(process.env.DISCORD_FEEDBACK_CHANNEL_ID || '1506948631360442411').trim();
const DISCORD_ADMIN_ROLE_ID = String(process.env.DISCORD_ADMIN_ROLE_ID || '1506948630920167458').trim();
const DISCORD_SUPPORTER_ROLE_ID = String(process.env.DISCORD_SUPPORTER_ROLE_ID || '1506948630907457714').trim();
const DISCORD_ADMIN_ROLE_NAMES = (process.env.DISCORD_ADMIN_ROLE_NAMES || 'admin,admins,administrator,staff,ادمن,owner,moderator,mod')
  .split(',')
  .map((roleName) => roleName.trim().toLowerCase())
  .filter(Boolean);

const DISCORD_SUPPORTER_ROLE_NAMES = (process.env.DISCORD_SUPPORTER_ROLE_NAMES || 'sponsor,sponsors,sabscriper,subscriber,subscribers,supporter,supporters,gold,silver,platinum,donator,donors,booster')
  .split(',')
  .map((roleName) => roleName.trim().toLowerCase())
  .filter(Boolean);

const statusClients = new Set();
let discordClient = null;
let adminsCache = {
  expiresAt: 0,
  data: null
};
let supportersCache = {
  expiresAt: 0,
  data: null
};
let discordGatewayStatus = {
  online: null,
  members: null,
  source: 'connecting',
  updatedAt: new Date().toISOString(),
  error: null
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const defaultSiteData = {
  wipe: {
    startAt: '',
    endAt: '',
    note: 'The next wipe date will be announced on Discord.'
  },
  events: []
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

function sendCorsOk(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end();
}

function broadcastDiscordStatus() {
  const payload = `data: ${JSON.stringify(discordGatewayStatus)}\n\n`;

  for (const client of statusClients) {
    try {
      client.write(payload);
    } catch {
      statusClients.delete(client);
    }
  }
}

function setDiscordGatewayStatus(nextStatus) {
  if (Object.entries(nextStatus).every(([key, value]) => discordGatewayStatus[key] === value)) return;
  discordGatewayStatus = {
    ...discordGatewayStatus,
    ...nextStatus,
    updatedAt: new Date().toISOString()
  };

  broadcastDiscordStatus();
}

function getGatewayOnlineCount() {
  const guild = discordClient?.guilds?.cache?.get(DISCORD_GUILD_ID);
  if (!guild) return null;

  return guild.presences.cache.filter((presence) => presence.status !== 'offline').size;
}

function updateGatewayOnlineCount() {
  const guild = discordClient?.guilds?.cache?.get(DISCORD_GUILD_ID);
  const online = getGatewayOnlineCount();

  if (!guild || typeof online !== 'number') return;

  setDiscordGatewayStatus({
    online,
    members: guild.memberCount ?? discordGatewayStatus.members,
    source: 'discord-gateway',
    error: null
  });
}

let isSyncingDiscord = false;
let lastRestSyncAt = 0;

async function syncDiscordData() {
  if (isSyncingDiscord) return;
  isSyncingDiscord = true;

  try {
    if (!DISCORD_BOT_TOKEN) {
      setDiscordGatewayStatus({
        source: 'bot-token-missing',
        error: 'DISCORD_BOT_TOKEN is missing'
      });
      return;
    }

    // 1. Try Discord Gateway (WebSocket) if connected - ZERO REST calls, use cache only
    if (discordClient && discordClient.isReady()) {
      const guild = discordClient.guilds.cache.get(DISCORD_GUILD_ID);
      if (guild) {
        // Use cache only - populated by Gateway GUILD_MEMBERS_CHUNK events, no REST needed
        const members = guild.members.cache;

        const adminMembers = members
          .filter((member) => !member.user?.bot && member.roles.cache.some((role) => {
            if (role.id === DISCORD_ADMIN_ROLE_ID) return true;
            const name = String(role.name || '').toLowerCase();
            return DISCORD_ADMIN_ROLE_NAMES.some((n) => name.includes(n));
          }))
          .map((member) => {
            const user = member.user || {};
            return {
              id: user.id,
              name: cleanDiscordText(member.displayName || member.nickname || user.globalName || user.username || 'Admin', 80),
              username: cleanDiscordText(user.username || 'admin', 80),
              avatar: member.displayAvatarURL ? member.displayAvatarURL({ extension: 'png', size: 128 }) : discordAvatarUrl(member),
              url: `https://discord.com/users/${user.id}`
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        adminsCache = {
          expiresAt: Date.now() + 30000,
          data: { ok: true, role: 'Admin', admins: adminMembers }
        };

        const supporterMembers = members
          .filter((member) => !member.user?.bot && member.roles.cache.some((role) => {
            if (role.id === DISCORD_SUPPORTER_ROLE_ID) return true;
            const name = String(role.name || '').toLowerCase();
            return DISCORD_SUPPORTER_ROLE_NAMES.some((n) => name.includes(n));
          }))
          .map((member) => {
            const user = member.user || {};
            return {
              id: user.id,
              name: cleanDiscordText(member.displayName || member.nickname || user.globalName || user.username || 'Supporter', 80),
              username: cleanDiscordText(user.username || 'supporter', 80),
              avatar: member.displayAvatarURL ? member.displayAvatarURL({ extension: 'png', size: 128 }) : discordAvatarUrl(member),
              url: `https://discord.com/users/${user.id}`
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        supportersCache = {
          expiresAt: Date.now() + 30000,
          data: { ok: true, role: 'Subscribers', supporters: supporterMembers }
        };

        updateGatewayOnlineCount();
        return;
      }
    }

    // 2. Fallback: if Gateway is not connected yet, fetch via Discord REST API (once every 60s)
    if (Date.now() - lastRestSyncAt < 60000) return;
    lastRestSyncAt = Date.now();
    try {
      const [guildData, roles, members] = await Promise.all([
        discordApi(`/guilds/${DISCORD_GUILD_ID}?with_counts=true`),
        discordApi(`/guilds/${DISCORD_GUILD_ID}/roles`),
        discordApi(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000`)
      ]);

      const adminRoleIds = new Set(roles.filter((role) => {
        if (role.id === DISCORD_ADMIN_ROLE_ID) return true;
        const name = String(role.name || '').toLowerCase();
        return DISCORD_ADMIN_ROLE_NAMES.some((n) => name.includes(n));
      }).map(r => r.id));

      const supporterRoleIds = new Set(roles.filter((role) => {
        if (role.id === DISCORD_SUPPORTER_ROLE_ID) return true;
        const name = String(role.name || '').toLowerCase();
        return DISCORD_SUPPORTER_ROLE_NAMES.some((n) => name.includes(n));
      }).map(r => r.id));

      const admins = members
        .filter((member) => !member.user?.bot && Array.isArray(member.roles) && member.roles.some((rId) => adminRoleIds.has(rId)))
        .map((member) => {
          const user = member.user || {};
          return {
            id: user.id,
            name: cleanDiscordText(member.nick || user.global_name || user.username || 'Admin', 80),
            username: cleanDiscordText(user.username || 'admin', 80),
            avatar: discordAvatarUrl(member),
            url: `https://discord.com/users/${user.id}`
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      adminsCache = {
        expiresAt: Date.now() + 60000,
        data: { ok: true, role: 'Admin', admins }
      };

      const supporters = members
        .filter((member) => !member.user?.bot && Array.isArray(member.roles) && member.roles.some((rId) => supporterRoleIds.has(rId)))
        .map((member) => {
          const user = member.user || {};
          return {
            id: user.id,
            name: cleanDiscordText(member.nick || user.global_name || user.username || 'Supporter', 80),
            username: cleanDiscordText(user.username || 'supporter', 80),
            avatar: discordAvatarUrl(member),
            url: `https://discord.com/users/${user.id}`
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      supportersCache = {
        expiresAt: Date.now() + 60000,
        data: { ok: true, role: 'Subscribers', supporters }
      };

      const onlineCount = typeof guildData.approximate_presence_count === 'number' 
        ? guildData.approximate_presence_count 
        : null;

      setDiscordGatewayStatus({
        online: onlineCount,
        members: guildData.approximate_member_count ?? discordGatewayStatus.members,
        source: 'discord-rest',
        error: null
      });
    } catch (err) {
      console.warn('REST fallback sync note:', err.message);
    }

  } catch (error) {
    console.warn('Discord Sync Error:', error.message);
  } finally {
    isSyncingDiscord = false;
  }
}

function startDiscordGateway() {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN is missing. Real-time Discord online count is disabled.');
    setDiscordGatewayStatus({
      source: 'bot-token-missing',
      error: 'DISCORD_BOT_TOKEN is missing'
    });
    return;
  }

  let discord;
  try {
    discord = require('discord.js');
  } catch (error) {
    setDiscordGatewayStatus({
      source: 'discord-gateway-error',
      error: 'discord.js is not installed. Run: npm install'
    });
    console.warn('discord.js is not installed. Run: npm install');
    return;
  }

  const { Client, Events, GatewayIntentBits } = discord;

  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers
    ]
  });

  discordClient.on(Events.ClientReady, async () => {
    console.log(`Discord Gateway connected as ${discordClient.user.tag}`);
    const guild = discordClient.guilds.cache.get(DISCORD_GUILD_ID) || await discordClient.guilds.fetch(DISCORD_GUILD_ID).catch((e) => {
      console.warn('Could not fetch guild:', e.message);
      return null;
    });
    if (!guild) {
      console.warn('Bot is not in configured guild:', DISCORD_GUILD_ID);
      setDiscordGatewayStatus({
        source: 'discord-gateway-error',
        error: 'Bot is not in the configured Discord guild'
      });
      return;
    }

    try {
      await guild.members.fetch();
      console.log(`Cached ${guild.members.cache.size} members from guild`);
    } catch (err) {
      console.warn('Initial member fetch notice:', err.message);
    }

    syncDiscordData();
    updateGatewayOnlineCount();
  });

  for (const event of [Events.MessageCreate, Events.MessageUpdate, Events.MessageDelete]) {
    discordClient.on(event, (...messages) => {
      if (messages.some(message => message?.channelId === DISCORD_EVENTS_CHANNEL_ID)) discordEventFeed.requestSync();
    });
  }
  discordClient.on(Events.MessageBulkDelete, (messages, channel) => {
    if (channel?.id === DISCORD_EVENTS_CHANNEL_ID) discordEventFeed.requestSync();
  });

  discordClient.on(Events.Warn, (info) => console.warn('Discord warn:', info));
  discordClient.on(Events.Error, (error) => console.warn('Discord error:', error.message));

  discordClient.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
    const guildId = newPresence?.guild?.id || oldPresence?.guild?.id;
    if (guildId === DISCORD_GUILD_ID) {
      updateGatewayOnlineCount();
    }
  });

  discordClient.on(Events.GuildMemberAdd, (member) => {
    if (member.guild.id === DISCORD_GUILD_ID) {
      syncDiscordData();
    }
  });

  discordClient.on(Events.GuildMemberRemove, (member) => {
    if (member.guild.id === DISCORD_GUILD_ID) {
      syncDiscordData();
    }
  });

  discordClient.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    if (newMember.guild.id === DISCORD_GUILD_ID) {
      syncDiscordData();
    }
  });

  discordClient.on(Events.UserUpdate, () => {
    syncDiscordData();
  });

  discordClient.on(Events.Error, (error) => {
    console.warn('Discord Gateway error:', error.message);
  });

  discordClient.on(Events.ShardDisconnect, () => {
    setDiscordGatewayStatus({ source: 'connecting', error: 'Discord Gateway disconnected' });
  });

  discordClient.on(Events.ShardReconnecting, () => {
    setDiscordGatewayStatus({ source: 'connecting', error: null });
  });

  discordClient.on(Events.ShardResume, () => {
    syncDiscordData();
  });

  discordClient.login(DISCORD_BOT_TOKEN).catch((error) => {
    setDiscordGatewayStatus({
      source: 'discord-gateway-error',
      error: error.message
    });
    console.warn(`Discord Gateway login failed: ${error.message}`);
  });

  // Sync: reads from Gateway cache if connected, or safely polls REST every 60s
  setInterval(syncDiscordData, 15000);
  setTimeout(syncDiscordData, 1500);
}

function cleanDiscordText(value, maxLength) {
  return String(value || '')
    .replace(/@/g, '@\u200b')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanField(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeDateValue(value) {
  const nextValue = cleanField(value, 40);
  if (!nextValue) return '';

  const timestamp = Date.parse(nextValue);
  return Number.isNaN(timestamp) ? '' : nextValue;
}

function sanitizeUrlValue(value) {
  const nextValue = cleanField(value, 500);
  if (!nextValue) return '';

  try {
    const url = new URL(nextValue);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return /^\/?assets\//.test(nextValue) && !nextValue.includes('..') ? nextValue : '';
  }
}

function normalizeEventData(event, index) {
  const source = event && typeof event === 'object' ? event : {};

  return {
    id: cleanField(source.id || `event-${index + 1}`, 80),
    title: cleanField(source.title, 90),
    description: cleanField(source.description, 500),
    startsAtMoscow: sanitizeDateValue(source.startsAtMoscow),
    imageUrl: sanitizeUrlValue(source.imageUrl),
    location: cleanField(source.location, 140)
  };
}

function hasEventContent(event) {
  return Boolean(
    event.title ||
    event.description ||
    event.startsAtMoscow ||
    event.imageUrl ||
    event.location
  );
}

function normalizeSiteData(data) {
  const source = data && typeof data === 'object' ? data : {};
  const wipe = source.wipe && typeof source.wipe === 'object' ? source.wipe : {};
  const rawEvents = Array.isArray(source.events)
    ? source.events
    : (source.event && typeof source.event === 'object' ? [source.event] : defaultSiteData.events);
  const events = rawEvents
    .slice(0, 12)
    .map(normalizeEventData)
    .filter(hasEventContent);

  return {
    wipe: {
      startAt: sanitizeDateValue(wipe.startAt),
      endAt: sanitizeDateValue(wipe.endAt),
      note: cleanField(wipe.note ?? defaultSiteData.wipe.note, 220)
    },
    events
  };
}

let siteDataCache = null;

function snapshotSiteData(data) {
  const normalized = normalizeSiteData(data);
  const revision = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return { ...normalized, revision };
}

function readSiteData() {
  if (siteDataCache) return siteDataCache;
  try {
    const sourcePath = fs.existsSync(SITE_DATA_PATH) ? SITE_DATA_PATH : BUNDLED_SITE_DATA_PATH;
    if (!fs.existsSync(sourcePath)) {
      return (siteDataCache = snapshotSiteData(defaultSiteData));
    }

    const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    return (siteDataCache = snapshotSiteData({
      wipe: { ...defaultSiteData.wipe, ...(parsed.wipe || {}) },
      events: Array.isArray(parsed.events) ? parsed.events : (parsed.event ? [parsed.event] : defaultSiteData.events)
    }));
  } catch {
    return snapshotSiteData(defaultSiteData);
  }
}

function writeSiteData(data) {
  const nextData = normalizeSiteData(data);
  fs.mkdirSync(path.dirname(SITE_DATA_PATH), { recursive: true });
  const temporaryPath = `${SITE_DATA_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, SITE_DATA_PATH);
  siteDataCache = snapshotSiteData(nextData);
  broadcastSiteData();
  return siteDataCache;
}

const eventImageCache = new EventImageCache(path.join(DATA_DIR, 'event-images'));
const discordEventFeed = new DiscordEventFeed({
  channelId: DISCORD_EVENTS_CHANNEL_ID, filePath: path.join(DATA_DIR, 'discord-events.json'),
  api: discordApi, onChange: broadcastSiteData, prepareEvents: events => eventImageCache.prepare(events)
});
function publicSiteData() { return { ok: true, ...readSiteData(), ...discordEventFeed.snapshot() }; }
function broadcastSiteData() {
  const payload = `event: site-control\ndata: ${JSON.stringify(publicSiteData())}\n\n`;
  for (const client of statusClients) {
    if (client.destroyed || client.writableLength > 64 * 1024) {
      client.destroy();
      statusClients.delete(client);
      continue;
    }
    client.write(payload);
  }
}

function getSuppliedAdminPassword(req, body = {}) {
  const authHeader = String(req.headers.authorization || '');
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : String(body.adminPassword || '');
}

function authorizeAdmin(req, res, body = {}) {
  if (!ADMIN_PASSWORD) {
    sendJson(res, 503, { ok: false, error: 'Admin access is not configured on the server.' });
    return false;
  }
  if (getSuppliedAdminPassword(req, body) !== ADMIN_PASSWORD) {
    sendJson(res, 401, { ok: false, error: 'Wrong admin password' });
    return false;
  }
  return true;
}

function handleAdminSession(req, res) {
  if (req.method === 'OPTIONS') return sendCorsOk(res);
  if (req.method !== 'POST') return send(res, 405, 'Method Not Allowed');
  if (authorizeAdmin(req, res)) sendJson(res, 200, { ok: true });
}

function readJsonBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;
    let oversized = false;

    req.on('data', (chunk) => {
      if (oversized) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        oversized = true;
        body = '';
        return;
      }

      body += chunk;
    });

    req.on('end', () => {
      if (oversized) {
        reject(new Error('Request body is too large. Save the image with Choose Image first, then click Save Changes.'));
        return;
      }

      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

function readRawBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let oversized = false;

    req.on('data', (chunk) => {
      if (oversized) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        oversized = true;
        chunks.length = 0;
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (oversized) {
        reject(new Error('Image is too large. Max size is 25MB.'));
        return;
      }

      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function imageExtensionFromContentType(contentType) {
  const cleanType = String(contentType || '').split(';')[0].trim().toLowerCase();
  return {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }[cleanType] || '';
}

async function handleFeedbackRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  if (!discordClient?.isReady?.()) {
    sendJson(res, 503, { ok: false, error: 'Discord bot is not connected yet' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const name = cleanDiscordText(body.name || 'Anonymous', 80) || 'Anonymous';
    const message = cleanDiscordText(body.message, 1000);

    if (message.length < 3) {
      sendJson(res, 400, { ok: false, error: 'Feedback message is too short' });
      return;
    }

    const channel = await discordClient.channels.fetch(DISCORD_FEEDBACK_CHANNEL_ID);
    if (!channel?.send) {
      sendJson(res, 500, { ok: false, error: 'Feedback channel is not writable' });
      return;
    }

    await channel.send({
      content: [
        '**Website Feedback**',
        `**Name:** ${name}`,
        `**Page:** ${cleanDiscordText(body.page || 'Website', 160)}`,
        '',
        message
      ].join('\n'),
      allowedMentions: { parse: [] }
    });

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || 'Failed to send feedback' });
  }
}

function discordDefaultAvatarUrl(user) {
  const index = user.discriminator && user.discriminator !== '0'
    ? Number(user.discriminator) % 5
    : Number((BigInt(user.id) >> 22n) % 6n);

  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function discordAvatarUrl(member) {
  const user = member.user || {};

  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${DISCORD_GUILD_ID}/users/${user.id}/avatars/${member.avatar}.png?size=128`;
  }

  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
  }

  return discordDefaultAvatarUrl(user);
}

async function discordApi(pathname) {
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Discord API error ${response.status}`);
    error.status = response.status;
    error.retryAfterMs = Number(data.retry_after || 0) * 1000;
    throw error;
  }

  return data;
}

function handleAdminsRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const data = adminsCache.data || { ok: true, role: 'Admin', admins: [] };
  sendJson(res, 200, data);
}

function handleSupportersRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const data = supportersCache.data || { ok: true, role: 'Subscribers', supporters: [] };
  sendJson(res, 200, data);
}

async function handleSiteControlRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    sendJson(res, 200, publicSiteData());
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const body = await readJsonBody(req, 5 * 1024 * 1024);
    if (!authorizeAdmin(req, res, body)) return;

    const data = writeSiteData(body.data || body);
    sendJson(res, 200, { ok: true, ...data });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Could not save site control data' });
  }
}

async function handleEventImageUpload(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  if (!authorizeAdmin(req, res)) return;

  try {
    const extension = imageExtensionFromContentType(req.headers['content-type']);
    if (!extension) {
      sendJson(res, 400, { ok: false, error: 'Only PNG, JPG, JPEG, WEBP, and GIF images are supported' });
      return;
    }

    const imageBuffer = await readRawBody(req);
    if (!imageBuffer.length) {
      sendJson(res, 400, { ok: false, error: 'No image uploaded' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = `event-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    sendJson(res, 200, {
      ok: true,
      imageUrl: `/assets/uploads/${fileName}`
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Could not upload image' });
  }
}

function injectDiscordStatus(html) {
  const statusText =
    typeof discordGatewayStatus.online === 'number'
      ? `${discordGatewayStatus.online} online`
      : 'checking online';

  return html.replace(
    /(<span id="discordOnline" class="discord-online" aria-live="polite">)(.*?)(<\/span>)/,
    `$1${statusText}$3`
  );
}

const templateCache = new Map();
const assetVersions = new Map();
function versionAssets(html) {
  return html.replace(/(\/?assets\/[\w/.-]+\.(?:js|css|webp|png|jpg|mp3)|styles\.css)(?=["\s])/g, (url) => {
    if (!assetVersions.has(url)) {
      const file = path.join(PUBLIC_DIR, url.replace(/^\//, ''));
      if (!fs.existsSync(file)) return url;
      assetVersions.set(url, createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12));
    }
    return `${url}?v=${assetVersions.get(url)}`;
  });
}

async function loadTemplate(filePath) {
  if (!templateCache.has(filePath)) templateCache.set(filePath, versionAssets(await fs.promises.readFile(filePath, 'utf8')));
  return templateCache.get(filePath);
}

async function serveIndex(filePath, req, res) {
  try {
    const template = await loadTemplate(filePath);
    const snapshot = publicSiteData();
    const json = JSON.stringify(snapshot).replace(/</g, '\\u003c');
    const body = injectDiscordStatus(template).replace('<!--SITE_CONTROL_DATA-->', `<script id="site-control-data" type="application/json">${json}</script>`);
    await sendPage(req, res, body, 'text/html; charset=utf-8', { 'X-Site-Revision': snapshot.revision, 'Cache-Control': 'no-store' });
  } catch {
    if (!res.headersSent) send(res, 500, 'Could not load website');
  }
}

async function serveHtmlFile(filePath, req, res) {
  try {
    await sendPage(req, res, await loadTemplate(filePath), 'text/html; charset=utf-8');
  } catch {
    if (!res.headersSent) send(res, 404, 'Not Found');
  }
}

function getSafePath(urlPath) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[\\/]+/, '');
  const normalizedPath = path.normalize(requestedPath);
  const segments = normalizedPath.split(/[\\/]/);
  if (segments.some((segment) => segment.startsWith('.'))) return null;
  const publicFiles = new Set(['index.html', 'styles.css', 'admin-rz-26ecu.html', 'favicon.ico', 'robots.txt']);
  if (segments[0] !== 'assets' && !publicFiles.has(normalizedPath)) return null;
  if (segments[0] === 'assets' && segments[1] === 'event-images') {
    return segments.length === 3 && /^[a-f0-9]{32}-(640|1280)\.webp$/.test(segments[2])
      ? path.join(DATA_DIR, 'event-images', segments[2]) : null;
  }
  if (segments[0] === 'assets' && segments[1] === 'uploads' && segments.length === 3) {
    const uploadedPath = path.join(UPLOAD_DIR, segments[2]);
    if (fs.existsSync(uploadedPath)) return uploadedPath;
  }
  const filePath = path.join(PUBLIC_DIR, normalizedPath);
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(PUBLIC_DIR, resolvedPath);

  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
    ? resolvedPath
    : null;
}

// Keep SSE connections alive with heartbeat
setInterval(() => {
  if (!statusClients.size) return;
  for (const client of statusClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch {
      statusClients.delete(client);
    }
  }
}, 15000);

const server = http.createServer((req, res) => {
  // Force automatic HTTPS redirect
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto === 'http') {
    res.writeHead(301, {
      Location: `https://${req.headers.host}${req.url}`
    });
    res.end();
    return;
  }

  if (!req.url || !['GET', 'HEAD', 'POST', 'OPTIONS'].includes(req.method || '')) {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const route = req.url.split('?')[0];

  if (route === '/api/admin-session') {
    handleAdminSession(req, res);
    return;
  }

  if (route === '/api/feedback') {
    handleFeedbackRequest(req, res);
    return;
  }

  if (route === '/api/admins') {
    handleAdminsRequest(req, res);
    return;
  }

  if (route === '/api/supporters') {
    handleSupportersRequest(req, res);
    return;
  }

  if (route === '/api/discord-events') {
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method Not Allowed');
    sendJson(res, 200, { ok: true, ...discordEventFeed.snapshot(), sync: discordEventFeed.status });
    return;
  }

  if (route === '/api/site-control') {
    handleSiteControlRequest(req, res);
    return;
  }

  if (route === '/api/upload-event-image') {
    handleEventImageUpload(req, res);
    return;
  }

  if (route === '/admin-rz-26ecu' || route === '/Admin' || route === '/Admin/' || route === '/admin' || route === '/admin/') {
    serveHtmlFile(path.join(PUBLIC_DIR, 'admin-rz-26ecu.html'), req, res);
    return;
  }

  if (route === '/api/discord-status') {
    const isReady = typeof discordGatewayStatus.online === 'number';
    sendJson(res, 200, discordGatewayStatus);
    return;
  }

  if (route === '/api/discord-status-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.write(`data: ${JSON.stringify(discordGatewayStatus)}\n\n`);
    res.write(`event: site-control\ndata: ${JSON.stringify(publicSiteData())}\n\n`);

    statusClients.add(res);
    res.on('close', () => {
      statusClients.delete(res);
    });
    return;
  }

  if (route === '/home' || route === '/home/' || route === '/Home' || route === '/Home/') {
    serveIndex(path.join(PUBLIC_DIR, 'index.html'), req, res);
    return;
  }

  const filePath = getSafePath(req.url);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }

    if (path.basename(filePath).toLowerCase() === 'index.html') {
      serveIndex(filePath, req, res);
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    sendStatic(req, res, filePath, stat, contentType).catch(() => {
      if (!res.headersSent) send(res, 500, 'Could not load asset');
      else res.destroy();
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`RAIDZONE PURGATORY is running at http://${HOST}:${server.address().port}`);
  console.log(`Open it on this PC: http://127.0.0.1:${PORT}`);
});

startDiscordGateway();
if (DISCORD_BOT_TOKEN) discordEventFeed.start();
