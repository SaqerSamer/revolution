(function (root) {
  'use strict';
  function sameSnapshot(left, right) {
    return Boolean(left?.revision && left.revision === right?.revision
      && JSON.stringify(left.wipe) === JSON.stringify(right.wipe)
      && JSON.stringify(left.events) === JSON.stringify(right.events));
  }

  async function publishAndVerify({ data, password, apiOrigin = '', fetchImpl = fetch, onStage = () => {}, timeoutMs = 18000, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let saved = false;
    const request = (url, options = {}) => fetchImpl(`${apiOrigin}${url}`, { cache: 'no-store', redirect: 'error', signal: controller.signal, ...options });
    try {
      onStage('saving');
      const response = await request('/api/site-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ data })
      });
      const snapshot = await response.json();
      if (!response.ok || !snapshot.ok) throw new Error(snapshot.error || 'تعذّر حفظ التعديل. حاول مرة أخرى.');
      saved = true;
      onStage('verifying');
      for (let attempt = 0; attempt < 4; attempt++) {
        if (controller.signal.aborted) throw new Error('timeout');
        const nonce = `${Date.now()}-${attempt}`;
        const [liveResponse, pageResponse] = await Promise.all([
          request(`/api/site-control?verify=${nonce}`),
          request(`/?verify=${nonce}`)
        ]);
        if (liveResponse.ok && pageResponse.ok) {
          const live = await liveResponse.json();
          const html = await pageResponse.text();
          const embedded = /<script id="site-control-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
          let pageData;
          try { pageData = embedded && JSON.parse(embedded[1]); } catch {}
          if (sameSnapshot(snapshot, live) && sameSnapshot(snapshot, pageData)
              && pageResponse.headers.get('x-site-revision') === snapshot.revision) return snapshot;
        }
        if (attempt < 3) await wait(300 * (attempt + 1));
      }
      throw new Error('verification');
    } catch (error) {
      if (saved) throw new Error('تم الحفظ، لكن تعذّر تأكيد ظهور آخر تعديل على الموقع. افتح الموقع للتحقق ثم أعد المحاولة.');
      if (controller.signal.aborted) throw new Error('انتهت مهلة الاتصال. تحقّق من الإنترنت ومن بيانات الموقع قبل إعادة الحفظ.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  const api = { publishAndVerify, sameSnapshot };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.revolutionAdminSave = api;
})(typeof window === 'undefined' ? globalThis : window);
