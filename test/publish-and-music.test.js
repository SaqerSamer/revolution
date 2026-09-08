const test = require('node:test');
const assert = require('node:assert/strict');
const { publishAndVerify } = require('../assets/admin-save');
const { createPlayback } = require('../assets/music');
const { parseRange } = require('../lib/http-assets');

const snapshot = { ok: true, revision: 'current', wipe: { note: 'New content' }, events: [] };
function response(body, status = 200, headers) { return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }); }
function publicPage(data) { return response(`<script id="site-control-data" type="application/json">${JSON.stringify(data)}</script>`, 200, { 'x-site-revision': data.revision }); }

test('success waits for public page to catch up; only one POST is issued', async () => {
  let posts = 0;
  let pageReads = 0;
  const stages = [];
  const result = await publishAndVerify({
    data: snapshot, password: 'test', wait: async () => {}, onStage: (s) => stages.push(s),
    fetchImpl: async (url, options) => {
      if (options.method === 'POST') { posts++; return response(snapshot); }
      if (url.startsWith('/api/')) return response(snapshot);
      return publicPage(++pageReads === 1 ? { ...snapshot, revision: 'old' } : snapshot);
    }
  });
  assert.deepEqual(result, snapshot);
  assert.equal(posts, 1);
  assert.equal(pageReads, 2);
  assert.deepEqual(stages, ['saving', 'verifying']);
});

test('saved API response cannot produce success when public content disagrees', async () => {
  await assert.rejects(publishAndVerify({
    data: snapshot, password: 'test', wait: async () => {},
    fetchImpl: async (url, options) => options.method === 'POST' || url.startsWith('/api/')
      ? response(snapshot) : publicPage({ ...snapshot, wipe: { note: 'Someone else changed it' } })
  }), /تعذّر تأكيد/);
});

test('authentication errors never enter verification', async () => {
  const stages = [];
  await assert.rejects(publishAndVerify({ data: {}, password: '', onStage: (s) => stages.push(s), fetchImpl: async () => response({ ok: false, error: 'Wrong admin password' }, 401) }), /Wrong admin password/);
  assert.deepEqual(stages, ['saving']);
});

test('verification timeout reports uncertainty instead of success', async () => {
  await assert.rejects(publishAndVerify({ data: {}, password: 'test', timeoutMs: 20,
    fetchImpl: async (url, options) => options.method === 'POST' ? response(snapshot) : new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  }), /تعذّر تأكيد/);
});

test('music deduplicates play calls and respects pause without resetting time or volume', async () => {
  let calls = 0;
  let resolvePlay;
  const audio = { paused: true, volume: 0.35, currentTime: 42, play() { calls++; return new Promise((resolve) => { resolvePlay = resolve; }); }, pause() { this.paused = true; } };
  const playback = createPlayback(audio);
  assert.equal(calls, 0, 'No automatic playback loop');
  const first = playback.play();
  assert.equal(playback.play(), first);
  assert.equal(calls, 1);
  playback.pause();
  resolvePlay();
  await first;
  assert.equal(playback.wantsPlayback(), false);
  assert.equal(playback.isPending(), false);
  assert.equal(audio.currentTime, 42);
  assert.equal(audio.volume, 0.35);
});

test('failed music playback allows an explicit retry without an automatic retry loop', async () => {
  let calls = 0;
  const audio = { paused: true, play() { calls++; return Promise.reject(new Error('NotAllowedError')); }, pause() {} };
  const playback = createPlayback(audio);
  assert.equal(await playback.play(), false);
  assert.equal(calls, 1);
  assert.equal(playback.isPending(), false);
  assert.equal(await playback.play(), false);
  assert.equal(calls, 2);
});

test('music clears its loading indicator when playback has settled', async () => {
  let lastPending;
  const audio = { paused: true, play() { this.paused = false; return Promise.resolve(); }, pause() {} };
  const playback = createPlayback(audio, () => { lastPending = playback.isPending(); });
  await playback.play();
  assert.equal(lastPending, false);
});

test('range parser handles media suffixes, oversized ends and invalid requests', () => {
  assert.deepEqual(parseRange('bytes=-500', 100), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=5-900', 100), { start: 5, end: 99 });
  for (const range of ['bytes=-0', 'bytes=-', 'bytes=50-1', 'bytes=100-', 'bytes=0-1,3-4', 'bytes=9007199254740992-']) assert.equal(parseRange(range, 100), null, range);
});
