const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');
const { EventImageCache, imageKey } = require('../lib/event-images');

test('heavy images become smaller WebP files without resizing and renewed signatures reuse the cache', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'event-images-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#ffe600' } }).png({ compressionLevel: 0 }).toBuffer();
  let calls = 0;
  const cache = new EventImageCache(directory, { fetchImpl: async () => {
    calls++; return new Response(input, { headers: { 'content-type': 'image/png' } });
  } });
  const original = 'https://cdn.discordapp.com/attachments/1/2/large.png?ex=123';
  const [first, duplicate] = await Promise.all([cache.get(original), cache.get(original)]);
  assert.deepEqual(first, duplicate); assert.equal(calls, 1);
  assert.deepEqual(first.variants.map(v => v.width), [2400]);
  for (const variant of first.variants) {
    const metadata = await sharp(await fs.readFile(path.join(directory, variant.file))).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, variant.width);
    assert.equal(variant.height, variant.width / 2);
  }
  await cache.get(original.replace('ex=123', 'ex=456')); assert.equal(calls, 1);
  const events = await cache.prepare([{ images: [original], description: 'Event' }]);
  assert.match(events[0].images[0], /^\/assets\/event-images\//);
  assert.equal(events[0].originalImages[0], original);
  assert.equal(events[0].imageVariants[0].length, 1);
  assert.ok(events[0].imageVariants[0][0].bytes < input.length);
  // A fresh process uses persisted optimized variants without re-downloading them.
  const restored = new EventImageCache(directory, { fetchImpl: async () => { throw new Error('Should use disk'); } });
  assert.deepEqual(await restored.get(original), first);
});

test('light Discord images keep their original URL and bytes without compression', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'event-images-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#ffe600' } }).png().toBuffer();
  const url = 'https://cdn.discordapp.com/attachments/1/2/light.png';
  const cache = new EventImageCache(directory, { fetchImpl: async () => new Response(input, { headers: { 'content-type': 'image/png' } }) });
  const [event] = await cache.prepare([{ description: 'Keep image', images: [url] }]);
  assert.equal(event.images[0], url);
  assert.deepEqual(event.imageVariants[0], []);
  assert.equal((await fs.readdir(directory)).filter(name => name.endsWith('.webp')).length, 0);
});

test('rejects unsafe hosts and oversized downloads without dropping the announcement', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'event-images-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const url of ['http://127.0.0.1/image', 'https://example.com/image', 'https://cdn.discordapp.com:444/image']) assert.throws(() => imageKey(url));
  const cache = new EventImageCache(directory, { fetchImpl: async () => new Response('too large', { headers: { 'content-type': 'image/png', 'content-length': '30000000' } }) });
  const url = 'https://cdn.discordapp.com/attachments/1/2/image.png';
  const events = await cache.prepare([{ images: [url], description: 'Keep this text' }]);
  assert.equal(events[0].description, 'Keep this text'); assert.equal(events[0].images[0], url);
  assert.equal(events[0].imageVariants[0], null);
});
