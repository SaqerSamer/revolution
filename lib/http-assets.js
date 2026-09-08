const fs = require('node:fs');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const gzip = promisify(zlib.gzip);
const textCache = new Map();

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function acceptsGzip(req) {
  return String(req.headers['accept-encoding'] || '').split(',').some((part) => {
    const [name, ...parameters] = part.trim().split(';');
    const quality = parameters.find((p) => p.trim().startsWith('q='));
    return name === 'gzip' && (!quality || Number(quality.trim().slice(2)) > 0);
  });
}

async function sendPage(req, res, body, contentType, extraHeaders = {}) {
  let buffer = Buffer.from(body);
  const headers = { 'Content-Type': contentType, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff', ...extraHeaders };
  if (acceptsGzip(req)) {
    buffer = await gzip(buffer);
    headers['Content-Encoding'] = 'gzip';
  }
  if (res.destroyed) return;
  res.writeHead(200, { ...headers, 'Content-Length': buffer.length });
  res.end(req.method === 'HEAD' ? undefined : buffer);
}

async function sendStatic(req, res, filePath, stat, contentType) {
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': /[?&]v=[a-f0-9]{12}(?:&|$)/.test(req.url) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    ETag: etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff'
  };
  const compressible = /\.(css|js|svg|json)$/i.test(filePath) && stat.size < 1024 * 1024;
  if (compressible) headers.Vary = 'Accept-Encoding';
  if (String(req.headers['if-none-match'] || '').split(/,\s*/).some((tag) => tag === etag || tag === `W/${etag}` || tag === '*')) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  let range = req.method === 'GET' ? req.headers.range : null;
  const ifRange = req.headers['if-range'];
  if (ifRange && ifRange !== etag && !(Date.parse(ifRange) >= Math.floor(stat.mtimeMs / 1000) * 1000)) range = null;
  if (range) {
    const bounds = parseRange(range, stat.size);
    if (!bounds) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}`, 'Content-Length': 0 });
      res.end();
      return;
    }
    res.writeHead(206, { ...headers, 'Content-Length': bounds.end - bounds.start + 1, 'Content-Range': `bytes ${bounds.start}-${bounds.end}/${stat.size}` });
    pipeFile(filePath, res, bounds);
    return;
  }
  if (compressible) {
    let entry = textCache.get(filePath);
    if (!entry || entry.etag !== etag) {
      const buffer = await fs.promises.readFile(filePath);
      entry = { etag, buffer, compressed: await gzip(buffer) };
      if (textCache.size >= 32) textCache.delete(textCache.keys().next().value);
      textCache.set(filePath, entry);
    }
    const compressed = acceptsGzip(req);
    const buffer = compressed ? entry.compressed : entry.buffer;
    if (compressed) headers['Content-Encoding'] = 'gzip';
    if (res.destroyed) return;
    res.writeHead(200, { ...headers, 'Content-Length': buffer.length });
    res.end(req.method === 'HEAD' ? undefined : buffer);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  pipeFile(filePath, res);
}

function pipeFile(filePath, res, options) {
  const stream = fs.createReadStream(filePath, options);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

module.exports = { parseRange, sendStatic, sendPage };
