const ADMIN_USERNAME = 'Admin';
    const ADMIN_SESSION_KEY = 'revolutionAdminSession';
    const API_ORIGIN = location.protocol === 'file:' ? 'http://127.0.0.1:20000' : '';
    let activeAdminPassword = '';
    const loginView = document.getElementById('loginView');
    const controlHeader = document.getElementById('controlHeader');
    const logoutButton = document.getElementById('logoutButton');
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    const loginStatus = document.getElementById('loginStatus');
    const statusText = document.getElementById('status');
    const form = document.getElementById('controlForm');
    const eventsList = document.getElementById('eventsList');
    const addEventButton = document.getElementById('addEvent');
    let eventsState = [];
    let isSaving = false;
    let isUploading = false;
    let lockedControls = [];
    const saveButton = document.getElementById('saveButton');
    const saveButtonLabel = document.getElementById('saveButtonLabel');
    const saveProgress = document.getElementById('saveProgress');
    const saveProgressText = document.getElementById('saveProgressText');

    function lockEditor(locked) {
      if (locked) {
        lockedControls = [...form.querySelectorAll('input, textarea, button')].map((element) => [element, element.disabled]);
        lockedControls.forEach(([element]) => { element.disabled = true; });
      } else {
        lockedControls.forEach(([element, disabled]) => { element.disabled = disabled; });
        lockedControls = [];
      }
      form.setAttribute('aria-busy', String(locked));
      logoutButton.disabled = locked;
    }

    function showSaveStage(stage) {
      const verifying = stage === 'verifying';
      saveProgressText.textContent = verifying ? 'جارٍ التأكد من ظهور التعديل على الموقع…' : 'جارٍ حفظ التعديلات…';
      saveButtonLabel.textContent = verifying ? 'جارٍ التحقق…' : 'جارٍ الحفظ…';
      saveProgress.dataset.stage = stage;
    }

    const fields = {
      wipeStartDate: document.getElementById('wipeStartDateInput'),
      wipeStartTime: document.getElementById('wipeStartTimeInput'),
      wipeEndDate: document.getElementById('wipeEndDateInput'),
      wipeEndTime: document.getElementById('wipeEndTimeInput'),
      wipeNote: document.getElementById('wipeNoteInput')
    };

    function apiUrl(path) {
      return `${API_ORIGIN}${path}`;
    }

    function friendlyFetchError(error, fallbackMessage) {
      const message = String(error?.message || '');
      return message.includes('Failed to fetch')
        ? 'Cannot reach the save server. Open the admin page from the live link and make sure Node is running on port 20000.'
        : (message || fallbackMessage);
    }

    function showStatus(message, isError = false) {
      statusText.textContent = message;
      statusText.classList.toggle('error', isError);
      statusText.classList.remove('success');
    }

    function showLoginStatus(message, isError = false) {
      loginStatus.textContent = message;
      loginStatus.classList.toggle('error', isError);
    }

    function unlockControlPanel(password) {
      activeAdminPassword = password;
      passwordInput.value = '';
      sessionStorage.setItem(ADMIN_SESSION_KEY, password);
      loginView.hidden = true;
      controlHeader.hidden = false;
      form.hidden = false;
      loadData();
    }

    function logoutControlPanel() {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      activeAdminPassword = '';
      passwordInput.value = '';
      loginStatus.textContent = '';
      statusText.textContent = '';
      form.hidden = true;
      controlHeader.hidden = true;
      loginView.hidden = false;
      usernameInput.value = ADMIN_USERNAME;
      passwordInput.focus();
    }

    function storedToMoscowParts(value) {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) return { day: '', time: '' };

      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23'
      }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});

      return {
        day: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}`
      };
    }

    function moscowPartsToStored(day, time) {
      return day && time ? `${day}T${time}:00+03:00` : '';
    }

    function createBlankEvent() {
      return {
        id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: '',
        startsAtMoscow: '',
        location: '',
        imageUrl: '',
        description: ''
      };
    }

    function renderEventsEditor() {
      if (!eventsList) return;
      if (!eventsState.length) {
        eventsList.innerHTML = '<div class="no-events-state">No events yet. Click Add Event to create one.</div>';
        return;
      }

      eventsList.innerHTML = eventsState.map((eventData, index) => {
        const eventTime = storedToMoscowParts(eventData.startsAtMoscow);
        const preview = eventData.imageUrl
          ? `<img src="${escapeAttribute(eventData.imageUrl)}" alt="" />`
          : 'NO IMAGE';

        return `
          <section class="event-editor" data-index="${index}">
            <div class="event-editor-top">
              <strong>Event ${String(index + 1).padStart(2, '0')}</strong>
              <button class="small-button remove-event" type="button" data-remove="${index}">Remove</button>
            </div>
            <label>
              Event Title
              <input data-event-field="title" maxlength="90" placeholder="Season Event" value="${escapeAttribute(eventData.title)}" />
            </label>
            <div class="date-time-grid">
              <label>
                Event Day
                <input data-event-field="eventDay" type="date" value="${eventTime.day}" />
              </label>
              <label>
                Event Time - Moscow
                <input data-event-field="eventTime" type="time" value="${eventTime.time}" />
              </label>
            </div>
            <label>
              In-game Location
              <input data-event-field="location" maxlength="140" placeholder="Map location / arena / coordinates" value="${escapeAttribute(eventData.location)}" />
            </label>
            <div class="image-upload-row">
              <div class="event-image-preview" data-preview="${index}">${preview}</div>
              <div class="upload-stack">
                <strong>Event Image</strong>
                <p>Upload PNG, JPG, JPEG, WEBP, or GIF directly from your device.</p>
                <label class="upload-button">
                  Choose Image
                  <input data-event-upload="${index}" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
                </label>
                <input data-event-field="imageUrl" type="hidden" value="${escapeAttribute(eventData.imageUrl)}" />
              </div>
            </div>
            <label>
              Event Details
              <textarea data-event-field="description" maxlength="500" placeholder="Write event rules, rewards, and details">${escapeHtml(eventData.description)}</textarea>
            </label>
          </section>
        `;
      }).join('');
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character]));
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function syncEventsFromDom() {
      eventsState = Array.from(eventsList.querySelectorAll('.event-editor')).map((editor, index) => {
        const getValue = (field) => editor.querySelector(`[data-event-field="${field}"]`)?.value || '';
        return {
          id: eventsState[index]?.id || `event-${index + 1}`,
          title: getValue('title'),
          startsAtMoscow: moscowPartsToStored(getValue('eventDay'), getValue('eventTime')),
          location: getValue('location'),
          imageUrl: getValue('imageUrl'),
          description: getValue('description')
        };
      });
    }

    function fillForm(data) {
      const wipeStart = storedToMoscowParts(data?.wipe?.startAt);
      const wipeEnd = storedToMoscowParts(data?.wipe?.endAt);
      fields.wipeStartDate.value = wipeStart.day;
      fields.wipeStartTime.value = wipeStart.time;
      fields.wipeEndDate.value = wipeEnd.day;
      fields.wipeEndTime.value = wipeEnd.time;
      fields.wipeNote.value = data?.wipe?.note || '';
      eventsState = Array.isArray(data?.events) ? data.events : [];
      renderEventsEditor();
    }

    async function loadData() {
      try {
        const response = await fetch(apiUrl('/api/site-control'), { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'Load failed');
        fillForm(data);
      } catch (error) {
        showStatus('Could not load current site data.', true);
      }
    }

    async function verifyAdminPassword(password) {
      const response = await fetch(apiUrl('/api/admin-session'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Login failed');
    }

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (username !== ADMIN_USERNAME || !password) {
        showLoginStatus('Wrong username or password.', true);
        return;
      }

      showLoginStatus('Signing in...');
      try {
        await verifyAdminPassword(password);
        showLoginStatus('');
        unlockControlPanel(password);
      } catch (error) {
        showLoginStatus(friendlyFetchError(error, 'Could not sign in.'), true);
      }
    });

    logoutButton.addEventListener('click', logoutControlPanel);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSaving || isUploading) return;
      syncEventsFromDom();

      const payload = {
        wipe: {
          startAt: moscowPartsToStored(fields.wipeStartDate.value, fields.wipeStartTime.value),
          endAt: moscowPartsToStored(fields.wipeEndDate.value, fields.wipeEndTime.value),
          note: fields.wipeNote.value
        },
        events: eventsState
      };

      isSaving = true;
      lockEditor(true);
      showStatus('');
      saveButton.classList.add('is-saving');
      saveProgress.hidden = false;
      try {
        const data = await window.revolutionAdminSave.publishAndVerify({
          data: payload,
          password: activeAdminPassword,
          apiOrigin: API_ORIGIN,
          onStage: showSaveStage
        });
        fillForm(data);
        showStatus('✓ تم التعديل بنجاح — التعديل صار مباشر على الموقع.');
        statusText.classList.add('success');
      } catch (error) {
        showStatus(friendlyFetchError(error, 'Could not save changes.'), true);
      } finally {
        isSaving = false;
        lockEditor(false);
        saveButton.classList.remove('is-saving');
        saveProgress.hidden = true;
        saveButtonLabel.textContent = 'Save Changes';
      }
    });

    addEventButton.addEventListener('click', () => {
      syncEventsFromDom();
      eventsState.push(createBlankEvent());
      renderEventsEditor();
    });

    eventsList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove]');
      if (!removeButton) return;
      syncEventsFromDom();
      const index = Number(removeButton.dataset.remove);
      eventsState.splice(index, 1);
      renderEventsEditor();
    });

    async function optimizeEventImage(file) {
      if (file.type === 'image/gif') return file;
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
        return blob && blob.size < file.size ? blob : file;
      } catch {
        return file;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async function uploadEventImage(fileInput) {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) throw new Error('Image is too large. Max size is 25MB.');

      if (!activeAdminPassword) {
        showStatus('Login again before uploading an image.', true);
        fileInput.value = '';
        return;
      }

      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        showStatus('Use PNG, JPG, JPEG, WEBP, or GIF only.', true);
        fileInput.value = '';
        return;
      }

      showStatus('Uploading image...');
      const upload = await optimizeEventImage(file);

      const response = await fetch(apiUrl('/api/upload-event-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeAdminPassword}`,
          'Content-Type': upload.type,
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: upload
      });
      const data = await response.json().catch(() => ({ ok: false, error: 'Upload server did not return JSON' }));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Image upload failed');
      }

      const editor = fileInput.closest('.event-editor');
      const imageUrlInput = editor.querySelector('[data-event-field="imageUrl"]');
      const preview = editor.querySelector('.event-image-preview');
      imageUrlInput.value = data.imageUrl;
      preview.innerHTML = `<img src="${escapeAttribute(data.imageUrl)}" alt="" />`;
      syncEventsFromDom();
      showStatus('Image uploaded. Click Save Changes to publish it.');
    }

    eventsList.addEventListener('change', async (event) => {
      const fileInput = event.target.closest('[data-event-upload]');
      if (!fileInput) return;
      if (isSaving || isUploading) return;
      isUploading = true;
      lockEditor(true);

      try {
        await uploadEventImage(fileInput);
      } catch (error) {
        const message = String(error.message || '');
        showStatus(message.includes('Failed to fetch')
          ? 'Upload failed because the save server is not reachable. Open the admin page from the live link and make sure Node is running on port 20000.'
          : (message || 'Could not upload image.'), true);
      } finally {
        isUploading = false;
        lockEditor(false);
      }
    });

    document.addEventListener('click', (event) => {
      const pickerInput = event.target.closest('input[type="date"], input[type="time"]');
      if (!pickerInput) return;

      pickerInput.focus();
      if (typeof pickerInput.showPicker === 'function') {
        try {
          pickerInput.showPicker();
        } catch {
          pickerInput.click();
        }
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      const pickerInput = event.target.closest('input[type="date"], input[type="time"]');
      if (!pickerInput || typeof pickerInput.showPicker !== 'function') return;

      event.preventDefault();
      pickerInput.showPicker();
    });

    usernameInput.value = ADMIN_USERNAME;
    localStorage.removeItem(ADMIN_SESSION_KEY);
    const savedPassword = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (savedPassword) {
      verifyAdminPassword(savedPassword)
        .then(() => unlockControlPanel(savedPassword))
        .catch(() => logoutControlPanel());
    }
