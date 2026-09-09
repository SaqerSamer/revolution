'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const COMPRESS_ABOVE = 512 * 1024;
const MAX_BYTES = 25 * 1024 * 1024;

function imageKey(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Unsupported image host');
  // Discord renews the signature, but the attachment bytes and cache key remain unchanged.
  return createHash('sha256').update('selective-v2:' + url.pathname).digest('hex').slice(0, 32);
}

class EventImageCache {
  constructor(directory, { fetchImpl = fetch, downloadTimeoutMs = 15000 } = {}) {
    this.directory = directory; this.fetchImpl = fetchImpl; this.downloadTimeoutMs = downloadTimeoutMs; this.pending = new Map(); this.lastCleanup = 0;
  }
  async get(url) {
    const key = imageKey(url);
    if (this.pending.has(key)) return this.pending.get(key);
    const operation = this.convert(url, key).finally(() => this.pending.delete(key));
    this.pending.set(key, operation);
    return operation;
  }
  async convert(url, key) {
    const manifest = path.join(this.directory, `${key}.json`);
    try {
      const cached = JSON.parse(await fs.readFile(manifest, 'utf8'));
      await Promise.all(cached.variants.map(v => fs.access(path.join(this.directory, v.file))));
      return cached;
    } catch {}
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((resolve, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new Error('Event image download timed out')); }, this.downloadTimeoutMs);
    });
    let input;
    try {
      input = await Promise.race([deadline, (async () => {
      const response = await this.fetchImpl(url, { signal: controller.signal, redirect: 'error' });
      if (!response.ok || !/^image\//i.test(response.headers.get('content-type') || '')) throw new Error('Could not fetch event image');
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Event image exceeds size limit');
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { controller.abort(); throw new Error('Event image exceeds size limit'); }
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
      })()]);
    } finally { clearTimeout(timeout); }
    const variants = [];
    await fs.mkdir(this.directory, { recursive: true });
    // Light images stay exactly as posted. Compress heavy images without resizing or cropping.
    if (input.length > COMPRESS_ABOVE) {
      const sharp = require('sharp');
      const { data, info } = await sharp(input, { animated: true, limitInputPixels: 40 * 1000 * 1000 })
        .rotate().webp({ quality: 85, effort: 3 }).toBuffer({ resolveWithObject: true });
      if (data.length < input.length) {
        const file = `${key}-compressed.webp`;
        await fs.writeFile(path.join(this.directory, `${file}.tmp`), data);
        await fs.rename(path.join(this.directory, `${file}.tmp`), path.join(this.directory, file));
        variants.push({ file, url: `/assets/event-images/${file}`, width: info.width, height: info.pageHeight || info.height, bytes: data.length });
      }
    }
    const result = { variants, originalBytes: input.length };
    await fs.writeFile(`${manifest}.tmp`, JSON.stringify(result));
    await fs.rename(`${manifest}.tmp`, manifest);
    return result;
  }
  async prepare(events) {
    const tasks = events.flatMap(event => event.images.map((url, index) => ({ event, url, index })));
    for (const event of events) { event.originalImages = [...event.images]; event.imageVariants = []; }
    let next = 0;
    const worker = async () => {
      while (next < tasks.length) {
        const { event, url, index } = tasks[next++];
        try {
          const { variants } = await this.get(url);
          if (variants.length) event.images[index] = variants[variants.length - 1].url;
          event.imageVariants[index] = variants;
        } catch (error) {
          // A bad image must not hide the announcement or other successful pictures.
          event.imageVariants[index] = null;
          console.warn('Event image optimization:', error.message);
        }
      }
    };
    await Promise.all([worker(), worker()]);
    // Retain a short grace period for open pages; remove only our expired cache files.
    if (Date.now() - this.lastCleanup > 3600000) {
      this.lastCleanup = Date.now();
      const active = new Set(tasks.map(task => { try { return imageKey(task.url); } catch { return ''; } }));
      for (const name of await fs.readdir(this.directory).catch(() => [])) {
        const match = /^([a-f0-9]{32})(?:-(?:640|1280|compressed)\.webp|\.json)$/.exec(name);
        if (!match || active.has(match[1])) continue;
        const file = path.join(this.directory, name);
        const stat = await fs.stat(file);
        if (Date.now() - stat.mtimeMs > 25 * 3600000) await fs.unlink(file);
      }
    }
    return events;
  }
}
module.exports = { EventImageCache, imageKey };
