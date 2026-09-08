window.raidzoneI18n?.init();
    const i18n = window.raidzoneI18n;
    const t = (key) => i18n?.t(key) || key;

    const copyButton = document.getElementById('copyCode');
    copyButton?.addEventListener('click', async () => {
      const code = copyButton.dataset.code || copyButton.textContent.trim();
      try {
        await navigator.clipboard.writeText(code);
        const original = copyButton.textContent;
        copyButton.textContent = t('COPIED');
        setTimeout(() => copyButton.textContent = original, 1200);
      } catch (error) {
        copyButton.textContent = t('COPY FAILED');
        setTimeout(() => copyButton.textContent = code, 1200);
      }
    });

    const publicStatusOrigin = 'https://missed-would-centres-exposure.trycloudflare.com';

    function statusUrl(path) {
      return window.location.protocol === 'file:' ? `${publicStatusOrigin}${path}` : path;
    }

    const siteHeader = document.getElementById('siteHeader');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    const mobileMenuQuery = window.matchMedia('(max-width: 720px)');

    function setMobileMenu(open) {
      if (!siteHeader || !mobileMenuToggle) return;

      siteHeader.classList.toggle('is-menu-open', open);
      mobileMenuToggle.setAttribute('aria-expanded', String(open));
      mobileMenuToggle.setAttribute('aria-label', open ? t('Close menu') : t('Open menu'));
    }

    mobileMenuToggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      setMobileMenu(!siteHeader?.classList.contains('is-menu-open'));
    });

    mainNav?.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setMobileMenu(false);
      }
    });

    document.addEventListener('click', (event) => {
      if (!mobileMenuQuery.matches || !siteHeader?.classList.contains('is-menu-open')) return;
      if (siteHeader.contains(event.target)) return;
      setMobileMenu(false);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setMobileMenu(false);
      }
    });

    mobileMenuQuery.addEventListener?.('change', (event) => {
      if (!event.matches) {
        setMobileMenu(false);
      }
    });

    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackStatus = document.getElementById('feedbackStatus');
    const adminList = document.getElementById('adminList');
    const supporterTicker = document.getElementById('supporterTicker');
    const wipeStart = document.getElementById('wipeStart');
    const wipeEnd = document.getElementById('wipeEnd');
    const wipeCountdown = document.getElementById('wipeCountdown');
    const wipeNote = document.getElementById('wipeNote');
    const eventSlider = document.getElementById('eventSlider');
    let currentSiteData = null;
    let wipeCountdownTimer = null;
    let supportersSignature = '';
    let latestSupporters = [];
    let latestAdmins = [];
    const bgMusic = document.getElementById('bgMusic');

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character]));
    }

    function renderAdmins(admins) {
      latestAdmins = admins;
      if (!adminList) return;

      if (!admins.length) {
        adminList.innerHTML = `<span class="admin-loading">${escapeHtml(t('No admins found in the Admin role.'))}</span>`;
        return;
      }

      adminList.innerHTML = admins.map((admin) => `
        <a class="admin-profile" href="${escapeHtml(admin.url)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(admin.avatar)}" alt="" loading="lazy" />
          <span>${escapeHtml(admin.name)}</span>
        </a>
      `).join('');
    }

    async function loadAdmins() {
      if (!adminList) return;

      try {
        const response = await fetch(statusUrl('/api/admins'), { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Could not load admins');
        }

        renderAdmins(data.admins || []);
      } catch (error) {
        adminList.innerHTML = `<span class="admin-loading">${escapeHtml(t('Enable Server Members Intent to show admins.'))}</span>`;
      }
    }

    function renderSupporters(supporters, force = false) {
      if (!supporterTicker) return;

      const safeSupporters = Array.isArray(supporters) ? supporters : [];
      latestSupporters = safeSupporters;
      const signature = JSON.stringify(safeSupporters) + mobileMenuQuery.matches + (i18n?.getLanguage() || 'en');
      if (!force && signature === supportersSignature) return;
      supportersSignature = signature;
      const isMobileLayout = mobileMenuQuery.matches;
      if (!safeSupporters.length) {
        const fallback = [
          `<span class="supporter-pill supporter-loading">${escapeHtml(t('Gold supporters coming soon'))}</span>`,
          '<span class="supporter-pill supporter-loading">REVOLUTION</span>',
          `<span class="supporter-pill supporter-loading">${escapeHtml(t('Support the server'))}</span>`
        ].join('');
        supporterTicker.innerHTML = `<div class="ticker-group">${fallback}</div><div class="ticker-group" aria-hidden="true">${fallback}</div>`;
        syncSupporterTickerSpeed();
        return;
      }

      const displaySupporters = safeSupporters;
      const repeated = [];
      const minimumItems = isMobileLayout ? 6 : 10;
      while (repeated.length < Math.max(minimumItems, displaySupporters.length)) {
        repeated.push(...displaySupporters);
      }

      const group = repeated.map((supporter) => `
        <a class="supporter-pill has-avatar" href="${escapeHtml(supporter.url)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(supporter.avatar)}" alt="" width="32" height="32" loading="lazy" decoding="async" />
          <span>${escapeHtml(supporter.name)}</span>
        </a>
        <span class="supporter-star" aria-hidden="true">&#9733;</span>
      `).join('');

      supporterTicker.innerHTML = `<div class="ticker-group">${group}</div><div class="ticker-group" aria-hidden="true">${group}</div>`;
      syncSupporterTickerSpeed();
    }

    function syncSupporterTickerSpeed() {
      if (!supporterTicker) return;

      requestAnimationFrame(() => {
        const firstGroup = supporterTicker.querySelector('.ticker-group');
        const groupWidth = firstGroup?.scrollWidth || 0;
        const seconds = mobileMenuQuery.matches
          ? Math.max(18, Math.round(groupWidth / 28))
          : Math.max(22, Math.round(groupWidth / 44));
        supporterTicker.style.animationDuration = `${seconds}s`;
      });
    }

    async function loadSupporters() {
      if (!supporterTicker) return;

      try {
        const response = await fetch(statusUrl('/api/supporters'), { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Could not load supporters');
        }

        renderSupporters(data.supporters || []);
      } catch (error) {
        renderSupporters([]);
      }
    }

    function formatDateTime(value, timeZone) {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) return t('TBA');

      return new Intl.DateTimeFormat(i18n?.getLocale() || 'en-GB', {
        timeZone,
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    }

    function formatCountdown(targetDate) {
      const diff = targetDate.getTime() - Date.now();
      if (Number.isNaN(targetDate.getTime())) return t('TBA');
      if (diff <= 0) return t('Live');

      const totalHours = Math.floor(diff / 3600000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (days > 0) return `${days} ${t('d')} ${hours} ${t('h')}`;
      if (hours > 0) return `${hours} ${t('h')} ${minutes} ${t('m')}`;
      return `${minutes} ${t('m')}`;
    }

    function renderWipe(wipe) {
      if (!wipe) return;

      const startDate = wipe.startAt ? new Date(wipe.startAt) : null;
      const endDate = wipe.endAt ? new Date(wipe.endAt) : null;
      const now = Date.now();
      const countdownTarget = startDate && startDate.getTime() > now ? startDate : endDate;

      if (wipeStart) wipeStart.textContent = wipe.startAt ? formatDateTime(wipe.startAt, 'Europe/Moscow') : t('TBA');
      if (wipeEnd) wipeEnd.textContent = wipe.endAt ? formatDateTime(wipe.endAt, 'Europe/Moscow') : t('TBA');
      if (wipeNote) wipeNote.textContent = wipe.note || t('The next wipe date will be announced on Discord.');
      if (wipeCountdown) wipeCountdown.textContent = countdownTarget ? formatCountdown(countdownTarget) : t('TBA');
    }

    function renderEvents(events) {
      if (!eventSlider) return;

      const safeEvents = Array.isArray(events) ? events.filter((eventData) => (
        eventData.title ||
        eventData.description ||
        eventData.startsAtMoscow ||
        eventData.imageUrl ||
        eventData.location
      )) : [];

      if (!safeEvents.length) {
        eventSlider.innerHTML = `
          <article class="event-slide empty-event">
            <div class="event-slide-body">
              <b>${escapeHtml(t('Season Event'))}</b>
              <h3>${escapeHtml(t('No events posted yet.'))}</h3>
              <p>${escapeHtml(t('Admins can add event slides from the hidden control page.'))}</p>
            </div>
          </article>
        `;
        return;
      }

      eventSlider.innerHTML = safeEvents.map((eventData, index) => {
        const image = eventData.imageUrl
          ? `<img src="${escapeHtml(eventData.imageUrl)}" alt="" loading="lazy" />`
          : `<div class="event-image-placeholder">${escapeHtml(t('REVOLUTION'))}</div>`;

        return `
          <article class="event-slide">
            <div class="event-slide-media">${image}</div>
            <div class="event-slide-body">
              <b>${escapeHtml(t('Event'))} ${String(index + 1).padStart(2, '0')}</b>
              <h3>${escapeHtml(eventData.title || t('Season Event'))}</h3>
              <p>${escapeHtml(eventData.description || t('Event details will be announced soon.'))}</p>
              <div class="event-meta-grid">
                <span><strong>${escapeHtml(t('Moscow'))}</strong>${escapeHtml(eventData.startsAtMoscow ? formatDateTime(eventData.startsAtMoscow, 'Europe/Moscow') : t('TBA'))}</span>
                <span><strong>${escapeHtml(t('Saudi'))}</strong>${escapeHtml(eventData.startsAtMoscow ? formatDateTime(eventData.startsAtMoscow, 'Asia/Riyadh') : t('TBA'))}</span>
                <span><strong>${escapeHtml(t('UTC'))}</strong>${escapeHtml(eventData.startsAtMoscow ? formatDateTime(eventData.startsAtMoscow, 'UTC') : t('TBA'))}</span>
                <span><strong>${escapeHtml(t('Location'))}</strong>${escapeHtml(eventData.location || t('TBA'))}</span>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderSiteControl(data, force = false) {
      if (!force && data?.revision && data.revision === currentSiteData?.revision) return;
      currentSiteData = data || {};
      document.documentElement.dataset.siteRevision = data?.revision || '';
      renderWipe(currentSiteData.wipe);
      renderEvents(currentSiteData.events);

      clearInterval(wipeCountdownTimer);
      wipeCountdownTimer = setInterval(() => { if (!document.hidden) renderWipe(currentSiteData.wipe); }, 30000);
    }

    async function loadSiteControl() {
      try {
        const response = await fetch(statusUrl('/api/site-control'), { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Could not load site controls');
        }

        renderSiteControl(data);
      } catch {
        // Keep the last successful content during a temporary network interruption.
        if (!currentSiteData) renderSiteControl({});
      }
    }

    feedbackForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const formData = new FormData(feedbackForm);
      const name = String(formData.get('name') || '').trim();
      const message = String(formData.get('message') || '').trim();
      const audioWasPlaying = bgMusic && !bgMusic.paused;
      const audioTime = bgMusic?.currentTime || 0;

      if (!message) {
        feedbackStatus.textContent = t('Write your feedback first.');
        feedbackStatus.classList.add('is-error');
        return;
      }

      const submitButton = feedbackForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      feedbackStatus.textContent = t('Sending feedback...');
      feedbackStatus.classList.remove('is-error');

      try {
        const response = await fetch(statusUrl('/api/feedback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            message,
            page: window.location.href
          })
        });
        const result = await response.json().catch(() => ({ ok: false, error: 'Feedback API did not return JSON' }));

        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Feedback failed');
        }

        feedbackForm.reset();
        feedbackStatus.textContent = t('Feedback sent to Discord.');
      } catch (error) {
        feedbackStatus.textContent = t('Could not send. Use Open Channel instead.');
        feedbackStatus.classList.add('is-error');
      } finally {
        submitButton.disabled = false;
        if (bgMusic && audioWasPlaying && bgMusic.currentTime < audioTime) {
          bgMusic.currentTime = audioTime;
        }
      }
    });

    window.addEventListener('raidzone:languagechange', () => {
      setMobileMenu(false);
      if (currentSiteData) {
        renderSiteControl(currentSiteData, true);
      }
      renderAdmins(latestAdmins);
      renderSupporters(latestSupporters, true);
      renderDiscordStatus(latestDiscordStatus);
      window.revolutionMusic?.refresh();
    });

    loadAdmins();
    loadSupporters();
    try {
      const embedded = JSON.parse(document.getElementById('site-control-data').textContent);
      renderSiteControl(embedded);
    } catch { loadSiteControl(); }
    setInterval(() => { if (!document.hidden) loadSupporters(); }, 60000);

    const discordOnline = document.getElementById('discordOnline');
    let latestDiscordStatus = null;

    function renderDiscordStatus(status) {
      if (!discordOnline) return;
      latestDiscordStatus = status || latestDiscordStatus;

      if (status && typeof status.online === 'number') {
        discordOnline.textContent = `${status.online} ${t('online')}`;
        return;
      }

      if (status?.source === 'bot-token-missing' || status?.source === 'discord-gateway-error') {
        discordOnline.textContent = t('bot setup needed');
        return;
      }

      if (!discordOnline.textContent.includes(t('online'))) {
        discordOnline.textContent = t('checking online');
      }
    }

    async function updateDiscordOnline() {
      if (!discordOnline) return;

      try {
        const response = await fetch(statusUrl('/api/discord-status'), { cache: 'no-store' });
        const status = await response.json();
        renderDiscordStatus(status);
      } catch (error) {
        renderDiscordStatus({ source: 'network-retry' });
      }
    }

    let liveStream = null;
    let fallbackTimer = null;
    let reconnectTimer = null;

    function stopLiveUpdates() {
      liveStream?.close();
      liveStream = null;
      clearInterval(fallbackTimer);
      clearTimeout(reconnectTimer);
      fallbackTimer = null;
      reconnectTimer = null;
    }

    function startPolling() {
      if (fallbackTimer || document.hidden) return;
      updateDiscordOnline();
      loadSiteControl();
      fallbackTimer = setInterval(() => {
        if (!document.hidden) { updateDiscordOnline(); loadSiteControl(); }
      }, 30000);
    }

    function startDiscordStatusStream() {
      if (!discordOnline) return;
      stopLiveUpdates();
      if (document.hidden) return;

      if (!('EventSource' in window)) {
        startPolling();
        return;
      }

      const stream = new EventSource(statusUrl('/api/discord-status-stream'));
      liveStream = stream;
      stream.onmessage = (event) => {
        try {
          renderDiscordStatus(JSON.parse(event.data));
        } catch (error) {
          // Ignore a malformed event and wait for the next valid one.
        }
      };
      stream.addEventListener('site-control', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.ok) renderSiteControl(data);
        } catch {}
      });
      stream.onerror = () => {
        stream.close();
        if (liveStream !== stream) return;
        liveStream = null;
        startPolling();
        reconnectTimer = setTimeout(startDiscordStatusStream, 30000);
      };
    }

    startDiscordStatusStream();
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('page-hidden', document.hidden);
      if (document.hidden) stopLiveUpdates();
      else { loadSiteControl(); startDiscordStatusStream(); }
    });
    window.addEventListener('pagehide', stopLiveUpdates);
    window.addEventListener('pageshow', (event) => { if (event.persisted) startDiscordStatusStream(); });

    // --- ELECTRIC EFFECTS & SCROLL DYNAMICS ---
    (function initElectricEngine() {
      const lightEffects = window.matchMedia('(max-width: 820px), (pointer: coarse), (prefers-reduced-motion: reduce)');
      if (lightEffects.matches || navigator.connection?.saveData) return;
      const canvas = document.getElementById('electricCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = 0;
      let height = 0;
      let particles = [];
      let lightningBolts = [];
      let lastScrollY = window.scrollY;
      let scrollSpeed = 0;
      let scrollVelocity = 0;
      let isVisible = !document.hidden;
      let animationFrameId = null;
      let lastFrameTime = 0;

      function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }

      window.addEventListener('resize', resize, { passive: true });
      resize();

      class Spark {
        constructor() {
          this.reset(true);
        }
        reset(initial = false) {
          this.x = Math.random() * width;
          this.y = initial ? Math.random() * height : (scrollVelocity >= 0 ? height + 10 : -10);
          this.size = Math.random() * 2.2 + 0.6;
          this.baseVx = (Math.random() - 0.5) * 1.2;
          this.baseVy = -(Math.random() * 1.5 + 0.5);
          this.alpha = Math.random() * 0.7 + 0.3;
          this.life = Math.random() * 120 + 80;
          this.age = 0;
          this.color = Math.random() > 0.3 ? '#ffe600' : (Math.random() > 0.5 ? '#fff466' : '#ffffff');
        }
        update() {
          this.age++;
          const vy = this.baseVy - (scrollSpeed * 0.08);
          this.x += this.baseVx + (Math.random() - 0.5) * 0.8;
          this.y += vy;

          if (this.age > this.life || this.y < -20 || this.y > height + 20 || this.x < -20 || this.x > width + 20) {
            this.reset(false);
          }
        }
        draw(context) {
          const progress = this.age / this.life;
          const fade = progress < 0.2 ? progress / 0.2 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
          context.save();
          context.globalAlpha = this.alpha * fade;
          context.fillStyle = this.color;
          context.shadowColor = '#ffe600';
          context.shadowBlur = this.size * 5;
          context.beginPath();
          context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }

      class Lightning {
        constructor() {
          this.segments = [];
          this.life = 0;
          this.maxLife = Math.floor(Math.random() * 8 + 6);
          this.generate();
        }
        generate() {
          const startX = Math.random() * width;
          const startY = Math.random() * (height * 0.6);
          let curX = startX;
          let curY = startY;
          const length = Math.random() * 180 + 90;
          const steps = Math.floor(length / 14);

          this.segments.push({ x: curX, y: curY });
          for (let i = 0; i < steps; i++) {
            curX += (Math.random() - 0.5) * 38;
            curY += Math.random() * 22 + 4;
            this.segments.push({ x: curX, y: curY });
          }
        }
        update() {
          this.life++;
        }
        draw(context) {
          if (!this.segments.length) return;
          const opacity = (1 - (this.life / this.maxLife)) * 0.75;
          context.save();
          context.strokeStyle = '#ffe600';
          context.lineWidth = Math.random() * 2 + 1;
          context.shadowColor = '#ffffff';
          context.shadowBlur = 18;
          context.globalAlpha = opacity;
          context.beginPath();
          context.moveTo(this.segments[0].x, this.segments[0].y);
          for (let i = 1; i < this.segments.length; i++) {
            context.lineTo(this.segments[i].x, this.segments[i].y);
          }
          context.stroke();
          context.restore();
        }
      }

      const count = Math.min(24, Math.floor(window.innerWidth / 60));
      for (let i = 0; i < count; i++) {
        particles.push(new Spark());
      }

      let scrollTimeout;
      window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        scrollVelocity = currentY - lastScrollY;
        scrollSpeed = Math.min(25, Math.max(-25, scrollVelocity));
        lastScrollY = currentY;

        // Trigger occasional electric voltage on fast scroll
        if (Math.abs(scrollVelocity) > 18 && lightningBolts.length < 3 && Math.random() > 0.6) {
          lightningBolts.push(new Lightning());
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          scrollSpeed = 0;
          scrollVelocity = 0;
        }, 120);
      }, { passive: true });

      function animate(timestamp = 0) {
        if (!isVisible || lightEffects.matches) return;
        animationFrameId = requestAnimationFrame(animate);
        if (timestamp - lastFrameTime < 1000 / 30) return;
        lastFrameTime = timestamp;

        ctx.clearRect(0, 0, width, height);

        // Rare ambient lightning bolt
        if (Math.random() < 0.012 && lightningBolts.length < 2) {
          lightningBolts.push(new Lightning());
        }

        // Draw and update sparks
        particles.forEach((p) => {
          p.update();
          p.draw(ctx);
        });

        // Draw and update lightning bolts
        for (let i = lightningBolts.length - 1; i >= 0; i--) {
          const bolt = lightningBolts[i];
          bolt.update();
          bolt.draw(ctx);
          if (bolt.life >= bolt.maxLife) {
            lightningBolts.splice(i, 1);
          }
        }

      }

      function resumeEffects() {
        isVisible = !document.hidden;
        cancelAnimationFrame(animationFrameId);
        if (isVisible && !lightEffects.matches) animationFrameId = requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, width, height);
      }
      document.addEventListener('visibilitychange', resumeEffects);
      lightEffects.addEventListener?.('change', resumeEffects);

      animate();
    })();

    // --- SCROLL REVEAL & DYNAMIC MOVEMENT OBSERVER ---
    (function initScrollReveal() {
      if (window.matchMedia('(max-width: 820px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
      const targets = document.querySelectorAll(
        '.about-copy, .about-card, .download-card, .event-slide, .terminal-panel, .event-panel, .support-card, .feedback-card, .rule-category, .server-card, .hero-copy'
      );

      targets.forEach((el) => el.classList.add('reveal-init'));

      if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      targets.forEach((el) => observer.observe(el));
    })();
