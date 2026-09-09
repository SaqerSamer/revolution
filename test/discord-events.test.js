const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DAY, stripMentions, fromMessage, DiscordEventFeed } = require('../lib/discord-events');
const channelId = '1507830430987194460';
const now = Date.parse('2026-09-09T12:00:00Z');
const post = (id = '123', extra = {}) => ({ id, channel_id: channelId, type: 0, timestamp: new Date(now - 1000).toISOString(), content: 'A new event', attachments: [], ...extra });
function fixture(t, api, clock = () => now) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'revolution-feed-'));
  const filePath = path.join(root, 'discord-events.json');
  const feed = new DiscordEventFeed({ channelId, filePath, api, now: clock });
  t.after(() => { feed.stop(); fs.rmSync(root, { recursive: true, force: true }); });
  return feed;
}
test('strips user/role/channel and plain mentions while keeping text, line breaks and emails', () => {
  assert.equal(stripMentions('<@123> <@!456> <@&789> <#345> @everyone @here @meta 🔥@طاقم\nStart now\n\nmail@example.com'), '🔥\nStart now\n\nmail@example.com');
  assert.equal(fromMessage(post('1', { content: '@meta <@&123>' }), channelId, now), null);
});
test('handles text, images, multiple pictures, rich embeds and unsafe image URLs', () => {
  const text = fromMessage(post('1', { content: '<script>alert(1)</script>\n' + 'x'.repeat(2500) }), channelId, now);
  assert.equal(text.description.length, 2526); // HTML remains text; the browser renderer escapes it.
  assert.deepEqual(text.images, []);
  const image = { content_type: 'image/png', url: 'https://cdn.discordapp.com/attachments/1/2/photo.png' };
  const mixed = fromMessage(post('2', { attachments: [image, { ...image, url: 'https://media.discordapp.net/attachments/1/3/second.png' }, { ...image, url: 'javascript:alert(1)' }] }), channelId, now);
  assert.equal(mixed.images.length, 2);
  assert.equal(fromMessage(post('3', { content: '', attachments: [image] }), channelId, now).description, '');
  const embed = fromMessage(post('4', { content: '', embeds: [{ type: 'rich', title: 'Event @meta', description: 'Details', image: { url: image.url } }] }), channelId, now);
  assert.equal(embed.description, 'Event\n\nDetails');
  assert.equal(fromMessage(post('5', { channel_id: 'another' }), channelId, now), null);
});
test('24 hours are measured from the original post, including after edits and restart', async t => {
  let time = now;
  let messages = [post('1')];
  const feed = fixture(t, async () => messages, () => time);
  await feed.sync();
  const expiry = feed.snapshot().discordEvents[0].expiresAt;
  messages = [post('1', { content: 'Updated', edited_timestamp: new Date(now + 10000).toISOString() })];
  await feed.sync();
  assert.equal(feed.events[0].expiresAt, expiry);
  const restored = new DiscordEventFeed({ channelId, filePath: feed.filePath, api: async () => [], now: () => time });
  assert.equal(restored.snapshot().discordEvents[0].description, 'Updated');
  time = now - 1000 + DAY;
  assert.deepEqual(restored.snapshot().discordEvents, []);
  feed.expire();
  assert.deepEqual(JSON.parse(fs.readFileSync(feed.filePath)).events, []);
  assert.equal(fromMessage(messages[0], channelId, time), null);
});
test('history paginates beyond 100 posts and reconciliation removes deleted posts', async t => {
  const first = Array.from({ length: 100 }, (_, i) => post(String(1000 - i)));
  let routes = [];
  let deleted = false;
  const feed = fixture(t, async route => {
    routes.push(route);
    return deleted ? [post('900')] : route.includes('before=901') ? [post('900')] : first;
  });
  await feed.sync();
  assert.equal(feed.events.length, 101);
  assert.equal(routes.length, 2);
  deleted = true; await feed.sync();
  assert.deepEqual(feed.events.map(e => e.id), ['discord-900']);
});
test('transient errors retain posts and rate limits delay retry', async t => {
  let time = now; let failing = false; let calls = 0;
  const feed = fixture(t, async () => {
    calls++;
    if (failing) throw Object.assign(new Error('Rate limited'), { status: 429, retryAfterMs: 90000 });
    return [post()];
  }, () => time);
  await feed.sync(); failing = true; await feed.sync();
  assert.equal(feed.snapshot().discordEvents.length, 1);
  await feed.sync(); assert.equal(calls, 2);
  time += 90001; failing = false; await feed.sync(); assert.equal(calls, 3);
});
test('expiry timer broadcasts removal without another Discord message', async t => {
  const time = Date.now();
  const feed = fixture(t, async () => [post('1', { timestamp: new Date(time - DAY + 100).toISOString() })], Date.now);
  let changes = 0; feed.onChange = () => changes++;
  feed.start();
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.deepEqual(feed.snapshot().discordEvents, []);
  assert.equal(changes, 2);
});
