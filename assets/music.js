(function (root) {
  'use strict';
  // One in-flight play request; pause cancels its intent without rewinding or reloading.
  function createPlayback(audio, onChange = () => {}, onError = () => {}) {
    let pending = null;
    let generation = 0;
    let wantsPlayback = false;
    function pause() {
      wantsPlayback = false;
      generation++;
      pending = null;
      audio.pause();
      onChange();
    }
    function play() {
      if (pending) return pending;
      wantsPlayback = true;
      if (!audio.paused) return Promise.resolve(true);
      const attempt = ++generation;
      audio.preload = 'auto';
      pending = Promise.resolve(audio.play()).then(() => {
        if (attempt !== generation) return false;
        onChange();
        return true;
      }).catch((error) => {
        if (attempt === generation) { wantsPlayback = false; onError(error); onChange(); }
        return false;
      }).finally(() => { if (attempt === generation) { pending = null; onChange(); } });
      onChange();
      return pending;
    }
    return { play, pause, isPending: () => Boolean(pending), wantsPlayback: () => wantsPlayback };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { createPlayback }; return; }

  const audio = document.getElementById('bgMusic');
  const gate = document.getElementById('audioGate');
  const dock = document.getElementById('audioDock');
  const toggle = document.getElementById('musicToggle');
  const slider = document.getElementById('musicVolume');
  const status = document.getElementById('musicStatus');
  if (!audio || !toggle || !slider) return;
  const t = (text) => root.raidzoneI18n?.t(text) || text;
  let closeTimer;
  let errorMessage = '';
  try {
    const saved = localStorage.getItem('revolutionMusicVolume');
    if (saved !== null && Number.isFinite(Number(saved))) audio.volume = Math.min(1, Math.max(0, Number(saved)));
  } catch {}
  function refresh() {
    const playing = !audio.paused;
    const buffering = playback.wantsPlayback() && (playback.isPending() || audio.readyState < 3);
    toggle.classList.toggle('is-playing', playing);
    dock.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', t(playing || playback.isPending() ? 'Pause background music' : 'Play background music'));
    toggle.setAttribute('aria-busy', String(buffering));
    slider.value = String(audio.volume);
    status.textContent = errorMessage ? t(errorMessage) : (buffering ? t('Loading music...') : '');
  }
  const playback = createPlayback(audio, refresh, () => { errorMessage = 'Music unavailable. Tap to retry.'; });
  function start() {
    errorMessage = '';
    return playback.play();
  }
  function enter(event) {
    if (event.target?.closest('.language-picker')) return;
    gate.classList.remove('is-visible');
    gate.hidden = true;
    start();
  }
  gate.hidden = false;
  gate.classList.add('is-visible');
  gate.addEventListener('click', enter);
  document.addEventListener('keydown', (event) => {
    if (gate.hidden || !['Enter', ' '].includes(event.key) || event.target.closest('button,input,a')) return;
    event.preventDefault();
    enter(event);
  });
  toggle.addEventListener('click', () => {
    if (playback.isPending() || !audio.paused) playback.pause();
    else start();
  });
  slider.addEventListener('input', () => {
    audio.volume = Math.min(1, Math.max(0, Number(slider.value)));
    try { localStorage.setItem('revolutionMusicVolume', String(audio.volume)); } catch {}
    refresh();
  });
  function showVolume() {
    clearTimeout(closeTimer);
    dock.classList.add('is-open');
    closeTimer = setTimeout(() => dock.classList.remove('is-open'), 2500);
  }
  for (const event of ['pointerenter', 'pointerdown', 'focusin']) dock.addEventListener(event, showVolume, { passive: true });
  for (const event of ['playing', 'pause', 'volumechange', 'waiting', 'stalled', 'canplay']) audio.addEventListener(event, refresh);
  audio.addEventListener('error', () => { errorMessage = 'Music unavailable. Tap to retry.'; refresh(); });
  root.revolutionMusic = { refresh };
  refresh();
})(typeof window === 'undefined' ? globalThis : window);
