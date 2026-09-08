const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { publishAndVerify } = require('../assets/admin-save');

test('admin authentication, saving, uploads and persistence across deployments', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'revolution-save-test-'));
  const volume = path.join(root, 'volume');
  const app = path.join(root, 'app');
  fs.mkdirSync(path.join(app, 'data'), { recursive: true });
  fs.mkdirSync(path.join(app, 'assets', 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(app, 'lib'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'server.js'), path.join(app, 'server.js'));
  fs.copyFileSync(path.join(__dirname, '..', 'lib', 'http-assets.js'), path.join(app, 'lib', 'http-assets.js'));
  fs.writeFileSync(path.join(app, 'index.html'), '<h1>Site</h1><!--SITE_CONTROL_DATA-->');
  const textAsset = '/* cached script */\n'.repeat(1000);
  fs.writeFileSync(path.join(app, 'assets', 'test.js'), textAsset);
  fs.writeFileSync(path.join(app, '.env'), '# No real credentials in this isolated fixture\n');
  fs.writeFileSync(path.join(app, 'assets', 'uploads', 'old.png'), 'bundled-image');
  fs.writeFileSync(path.join(app, 'data', 'site-control.json'), JSON.stringify({ wipe: { note: 'Bundled note' }, events: [] }));
  let child;
  let base;
  async function stop() {
    if (child && child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  }
  t.after(async () => { await stop(); fs.rmSync(root, { recursive: true, force: true }); });
  async function start(password) {
    child = spawn(process.execPath, ['server.js'], {
      cwd: app,
      env: { ...process.env, HOST: '127.0.0.1', PORT: '0', ADMIN_PASSWORD: password, DISCORD_BOT_TOKEN: '', RAILWAY_VOLUME_MOUNT_PATH: volume },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stderr.on('data', () => {});
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server did not start')), 10000);
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.stdout.on('data', (chunk) => {
        output += chunk;
        const match = output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); }
      });
    });
  }
  const auth = { Authorization: 'Bearer test-only-admin-password' };
  await start('test-only-admin-password');
  assert.equal((await (await fetch(`${base}/api/site-control`)).json()).wipe.note, 'Bundled note');
  for (const endpoint of ['admin-session', 'site-control', 'upload-event-image']) {
    const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, endpoint);
  }
  assert.equal((await fetch(`${base}/api/admin-session`, { method: 'POST', headers: auth })).status, 200);
  const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF8sAAAAASUVORK5CYII=', 'base64');
  const upload = await fetch(`${base}/api/upload-event-image`, { method: 'POST', headers: { ...auth, 'Content-Type': 'image/png' }, body: imageBytes });
  assert.equal(upload.status, 200);
  const { imageUrl } = await upload.json();
  const streamAbort = new AbortController();
  const streamResponse = await fetch(`${base}/api/discord-status-stream`, { signal: streamAbort.signal });
  const streamReader = streamResponse.body.getReader();
  const streamDecoder = new TextDecoder();
  let streamText = '';
  async function readUntil(text) {
    const timeout = setTimeout(() => streamAbort.abort(), 5000);
    try {
      while (!streamText.includes(text)) {
        const { value, done } = await streamReader.read();
        assert.equal(done, false, 'Live stream unexpectedly closed');
        streamText += streamDecoder.decode(value, { stream: true });
      }
    } finally { clearTimeout(timeout); }
  }
  await readUntil('event: site-control');
  const data = { wipe: { startAt: '2026-10-05T11:57:00.000Z', endAt: '2026-11-07T11:57:00.000Z', note: 'Saved note ملاحظة' }, events: [{ title: 'Saved event', imageUrl }] };
  const saved = await fetch(`${base}/api/site-control`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
  assert.equal(saved.status, 200);
  const expected = await saved.json();
  assert.equal(expected.wipe.note, data.wipe.note);
  assert.equal(expected.events[0].title, 'Saved event');
  assert.equal(expected.events[0].imageUrl, imageUrl, 'Uploaded image URL must survive normalization');
  await readUntil(expected.revision);
  streamAbort.abort();
  assert.deepEqual(await (await fetch(`${base}/api/site-control`)).json(), expected);
  assert.deepEqual(Buffer.from(await (await fetch(new URL(imageUrl, base))).arrayBuffer()), imageBytes);
  assert.equal(await (await fetch(`${base}/assets/uploads/old.png`)).text(), 'bundled-image');
  const stages = [];
  const verified = await publishAndVerify({ data, password: 'test-only-admin-password', apiOrigin: base, onStage: (stage) => stages.push(stage) });
  assert.deepEqual(verified, expected);
  assert.deepEqual(stages, ['saving', 'verifying']);
  const page = await fetch(base);
  assert.equal(page.headers.get('x-site-revision'), expected.revision);
  assert.ok((await page.text()).includes(expected.revision));
  for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=-10', imageBytes.length - 10, imageBytes.length - 1], ['bytes=10-', 10, imageBytes.length - 1], ['bytes=0-999999', 0, imageBytes.length - 1]]) {
    const response = await fetch(new URL(imageUrl, base), { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${imageBytes.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), imageBytes.subarray(start, end + 1));
  }
  const invalidRange = await fetch(new URL(imageUrl, base), { headers: { Range: 'bytes=99999-' } });
  assert.equal(invalidRange.status, 416);
  assert.equal(invalidRange.headers.get('content-range'), `bytes */${imageBytes.length}`);
  const script = await fetch(`${base}/assets/test.js`);
  assert.equal(script.headers.get('content-encoding'), 'gzip');
  assert.ok(Number(script.headers.get('content-length')) < textAsset.length / 4);
  assert.equal(await script.text(), textAsset);
  const cached = await fetch(`${base}/assets/test.js`, { headers: { 'If-None-Match': script.headers.get('etag') } });
  assert.equal(cached.status, 304);
  const staleIfRange = await fetch(new URL(imageUrl, base), { headers: { Range: 'bytes=0-1', 'If-Range': '"old"' } });
  assert.equal(staleIfRange.status, 200);
  for (const privatePath of ['.env', 'server.js', 'package.json', 'data/site-control.json', '.git/config', 'assets/%2eenv']) {
    assert.equal((await fetch(`${base}/${privatePath}`)).status, 403, privatePath);
  }
  await stop();
  // A new deployment can contain different seed data but must keep the saved volume data.
  fs.writeFileSync(path.join(app, 'data', 'site-control.json'), JSON.stringify({ wipe: { note: 'New deployment seed' }, events: [] }));
  await start('test-only-admin-password');
  assert.deepEqual(await (await fetch(`${base}/api/site-control`)).json(), expected);
  assert.deepEqual(Buffer.from(await (await fetch(new URL(imageUrl, base))).arrayBuffer()), imageBytes);
  await stop();
  await start('');
  for (const endpoint of ['admin-session', 'site-control', 'upload-event-image']) {
    const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 503, endpoint);
    assert.doesNotMatch(await response.text(), /is not defined/);
  }
});
