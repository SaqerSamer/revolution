const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!key || process.env[key]) continue;

    process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 20000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = __dirname;
const SITE_DATA_PATH = path.join(__dirname, 'data', 'site-control.json');
const UPLOAD_DIR = path.join(__dirname, 'assets', 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AlamouriVivi';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1506948630903521290';
const DISCORD_FEEDBACK_CHANNEL_ID = process.env.DISCORD_FEEDBACK_CHANNEL_ID || '1506948631360442411';
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID || '1506948630920167458';
const DISCORD_SUPPORTER_ROLE_ID = process.env.DISCORD_SUPPORTER_ROLE_ID || '1506948630907457714';
const DISCORD_ADMIN_ROLE_NAMES = (process.env.DISCORD_ADMIN_ROLE_NAMES || 'admin,admins,administrator,staff,ادمن')
  .split(',')
  .map((roleName) => roleName.trim().toLowerCase())
  .filter(Boolean);

const DISCORD_SUPPORTER_ROLE_NAMES = (process.env.DISCORD_SUPPORTER_ROLE_NAMES || 'sabscriper,subscriber,subscribers,supporter,supporters,donator,donors')
  .split(',')
  .map((roleName) => roleName.trim().toLowerCase())
  .filter(Boolean);

const statusClients = new Set();
let discordClient = null;
let adminsCache = {
  expiresAt: 0,
  data: null
};
let supportersCache = {
  expiresAt: 0,
  data: null
};
let discordGatewayStatus = {
  online: null,
  members: null,
  source: DISCORD_BOT_TOKEN ? 'gateway-starting' : 'bot-token-missing',
  updatedAt: new Date().toISOString(),
  error: DISCORD_BOT_TOKEN ? null : 'DISCORD_BOT_TOKEN is missing'
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const defaultSiteData = {
  wipe: {
    startAt: '',
    endAt: '',
    note: 'The next wipe date will be announced on Discord.'
  },
  events: []
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

function sendCorsOk(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end();
}

function broadcastDiscordStatus() {
  const payload = `data: ${JSON.stringify(discordGatewayStatus)}\n\n`;

  for (const client of statusClients) {
    client.write(payload);
  }
}

function setDiscordGatewayStatus(nextStatus) {
  discordGatewayStatus = {
    ...discordGatewayStatus,
    ...nextStatus,
    updatedAt: new Date().toISOString()
  };

  broadcastDiscordStatus();
}

function getGatewayOnlineCount() {
  const guild = discordClient?.guilds.cache.get(DISCORD_GUILD_ID);
  if (!guild) return null;

  return guild.presences.cache.filter((presence) => presence.status !== 'offline').size;
}

function updateGatewayOnlineCount() {
  const guild = discordClient?.guilds.cache.get(DISCORD_GUILD_ID);
  const online = getGatewayOnlineCount();

  if (!guild || typeof online !== 'number') return;

  setDiscordGatewayStatus({
    online,
    members: guild.memberCount ?? discordGatewayStatus.members,
    source: 'discord-gateway',
    error: null
  });
}

function startDiscordGateway() {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN is missing. Real-time Discord online count is disabled.');
    return;
  }

  let discord;
  try {
    discord = require('discord.js');
  } catch (error) {
    setDiscordGatewayStatus({
      source: 'discord-gateway-error',
      error: 'discord.js is not installed. Run: npm install'
    });
    console.warn('discord.js is not installed. Run: npm install');
    return;
  }

  const { Client, Events, GatewayIntentBits } = discord;

  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences]
  });

  discordClient.once(Events.ClientReady, () => {
    const guild = discordClient.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) {
      setDiscordGatewayStatus({
        source: 'discord-gateway-error',
        error: 'Bot is not in the configured Discord guild'
      });
      return;
    }

    updateGatewayOnlineCount();
    setTimeout(updateGatewayOnlineCount, 1500);
    console.log(`Discord Gateway connected as ${discordClient.user.tag}`);
  });

  discordClient.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
    const guildId = newPresence?.guild?.id || oldPresence?.guild?.id;
    if (guildId === DISCORD_GUILD_ID) {
      updateGatewayOnlineCount();
    }
  });

  discordClient.on(Events.Error, (error) => {
    setDiscordGatewayStatus({
      source: 'discord-gateway-error',
      error: error.message
    });
  });

  discordClient.login(DISCORD_BOT_TOKEN).catch((error) => {
    setDiscordGatewayStatus({
      source: 'discord-gateway-error',
      error: error.message
    });
    console.warn(`Discord Gateway login failed: ${error.message}`);
  });
}

function cleanDiscordText(value, maxLength) {
  return String(value || '')
    .replace(/@/g, '@\u200b')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanField(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeDateValue(value) {
  const nextValue = cleanField(value, 40);
  if (!nextValue) return '';

  const timestamp = Date.parse(nextValue);
  return Number.isNaN(timestamp) ? '' : nextValue;
}

function sanitizeUrlValue(value) {
  const nextValue = cleanField(value, 500);
  if (!nextValue) return '';

  try {
    const url = new URL(nextValue);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return nextValue.startsWith('assets/') ? nextValue : '';
  }
}

function normalizeEventData(event, index) {
  const source = event && typeof event === 'object' ? event : {};

  return {
    id: cleanField(source.id || `event-${index + 1}`, 80),
    title: cleanField(source.title, 90),
    description: cleanField(source.description, 500),
    startsAtMoscow: sanitizeDateValue(source.startsAtMoscow),
    imageUrl: sanitizeUrlValue(source.imageUrl),
    location: cleanField(source.location, 140)
  };
}

function hasEventContent(event) {
  return Boolean(
    event.title ||
    event.description ||
    event.startsAtMoscow ||
    event.imageUrl ||
    event.location
  );
}

function normalizeSiteData(data) {
  const source = data && typeof data === 'object' ? data : {};
  const wipe = source.wipe && typeof source.wipe === 'object' ? source.wipe : {};
  const rawEvents = Array.isArray(source.events)
    ? source.events
    : (source.event && typeof source.event === 'object' ? [source.event] : defaultSiteData.events);
  const events = rawEvents
    .slice(0, 12)
    .map(normalizeEventData)
    .filter(hasEventContent);

  return {
    wipe: {
      startAt: sanitizeDateValue(wipe.startAt),
      endAt: sanitizeDateValue(wipe.endAt),
      note: cleanField(wipe.note || defaultSiteData.wipe.note, 220)
    },
    events
  };
}

function readSiteData() {
  try {
    if (!fs.existsSync(SITE_DATA_PATH)) {
      return defaultSiteData;
    }

    const parsed = JSON.parse(fs.readFileSync(SITE_DATA_PATH, 'utf8'));
    return normalizeSiteData({
      wipe: { ...defaultSiteData.wipe, ...(parsed.wipe || {}) },
      events: Array.isArray(parsed.events) ? parsed.events : (parsed.event ? [parsed.event] : defaultSiteData.events)
    });
  } catch {
    return defaultSiteData;
  }
}

function writeSiteData(data) {
  const nextData = normalizeSiteData(data);
  fs.mkdirSync(path.dirname(SITE_DATA_PATH), { recursive: true });
  fs.writeFileSync(SITE_DATA_PATH, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8');
  return nextData;
}

function getSuppliedAdminPassword(req, body = {}) {
  const authHeader = String(req.headers.authorization || '');
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : String(body.adminPassword || '');
}

function readJsonBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;
    let oversized = false;

    req.on('data', (chunk) => {
      if (oversized) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        oversized = true;
        body = '';
        return;
      }

      body += chunk;
    });

    req.on('end', () => {
      if (oversized) {
        reject(new Error('Request body is too large. Save the image with Choose Image first, then click Save Changes.'));
        return;
      }

      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

function readRawBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let oversized = false;

    req.on('data', (chunk) => {
      if (oversized) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        oversized = true;
        chunks.length = 0;
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (oversized) {
        reject(new Error('Image is too large. Max size is 25MB.'));
        return;
      }

      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function imageExtensionFromContentType(contentType) {
  const cleanType = String(contentType || '').split(';')[0].trim().toLowerCase();
  return {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }[cleanType] || '';
}

async function handleFeedbackRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  if (!discordClient?.isReady?.()) {
    sendJson(res, 503, { ok: false, error: 'Discord bot is not connected yet' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const name = cleanDiscordText(body.name || 'Anonymous', 80) || 'Anonymous';
    const message = cleanDiscordText(body.message, 1000);

    if (message.length < 3) {
      sendJson(res, 400, { ok: false, error: 'Feedback message is too short' });
      return;
    }

    const channel = await discordClient.channels.fetch(DISCORD_FEEDBACK_CHANNEL_ID);
    if (!channel?.send) {
      sendJson(res, 500, { ok: false, error: 'Feedback channel is not writable' });
      return;
    }

    await channel.send({
      content: [
        '**Website Feedback**',
        `**Name:** ${name}`,
        `**Page:** ${cleanDiscordText(body.page || 'Website', 160)}`,
        '',
        message
      ].join('\n'),
      allowedMentions: { parse: [] }
    });

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || 'Failed to send feedback' });
  }
}

function discordDefaultAvatarUrl(user) {
  const index = user.discriminator && user.discriminator !== '0'
    ? Number(user.discriminator) % 5
    : Number((BigInt(user.id) >> 22n) % 6n);

  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function discordAvatarUrl(member) {
  const user = member.user || {};

  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${DISCORD_GUILD_ID}/users/${user.id}/avatars/${member.avatar}.png?size=128`;
  }

  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
  }

  return discordDefaultAvatarUrl(user);
}

async function discordApi(pathname) {
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Discord API error ${response.status}`);
  }

  return data;
}

async function getDiscordAdmins() {
  const now = Date.now();
  if (adminsCache.data && adminsCache.expiresAt > now) {
    return adminsCache.data;
  }

  if (!DISCORD_BOT_TOKEN) {
    throw new Error('Discord bot token is missing');
  }

  const roles = await discordApi(`/guilds/${DISCORD_GUILD_ID}/roles`);
  const adminRole = roles.find((role) => role.id === DISCORD_ADMIN_ROLE_ID)
    || roles.find((role) => DISCORD_ADMIN_ROLE_NAMES.some((roleName) => String(role.name || '').toLowerCase().includes(roleName)));

  if (!adminRole) {
    return {
      admins: [],
      note: `None of these roles were found: ${DISCORD_ADMIN_ROLE_NAMES.join(', ')}`
    };
  }

  const members = await discordApi(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000`);
  const admins = members
    .filter((member) => Array.isArray(member.roles) && member.roles.includes(adminRole.id))
    .map((member) => {
      const user = member.user || {};
      return {
        id: user.id,
        name: cleanDiscordText(member.nick || user.global_name || user.username || 'Admin', 80),
        username: cleanDiscordText(user.username || 'admin', 80),
        avatar: discordAvatarUrl(member),
        url: `https://discord.com/users/${user.id}`
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  adminsCache = {
    expiresAt: now + 60000,
    data: {
      role: adminRole.name,
      admins
    }
  };

  return adminsCache.data;
}

async function getDiscordSupporters() {
  const now = Date.now();
  if (supportersCache.data && supportersCache.expiresAt > now) {
    return supportersCache.data;
  }

  if (!DISCORD_BOT_TOKEN) {
    throw new Error('Discord bot token is missing');
  }

  const roles = await discordApi(`/guilds/${DISCORD_GUILD_ID}/roles`);
  const supporterRole = roles.find((role) => role.id === DISCORD_SUPPORTER_ROLE_ID)
    || roles.find((role) => {
      const roleName = String(role.name || '').toLowerCase();
      return DISCORD_SUPPORTER_ROLE_NAMES.some((name) => roleName.includes(name));
    });

  if (!supporterRole) {
    return {
      role: null,
      supporters: [],
      note: `None of these roles were found: ${DISCORD_SUPPORTER_ROLE_NAMES.join(', ')}`
    };
  }

  const members = await discordApi(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000`);
  const supporters = members
    .filter((member) => Array.isArray(member.roles) && member.roles.includes(supporterRole.id))
    .map((member) => {
      const user = member.user || {};
      return {
        id: user.id,
        name: cleanDiscordText(member.nick || user.global_name || user.username || 'Supporter', 80),
        username: cleanDiscordText(user.username || 'supporter', 80),
        avatar: discordAvatarUrl(member),
        url: `https://discord.com/users/${user.id}`
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  supportersCache = {
    expiresAt: now + 60000,
    data: {
      role: supporterRole.name,
      supporters
    }
  };

  return supportersCache.data;
}

async function handleAdminsRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const data = await getDiscordAdmins();
    sendJson(res, 200, { ok: true, ...data });
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      admins: [],
      error: error.message || 'Could not load admins'
    });
  }
}

async function handleSupportersRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const data = await getDiscordSupporters();
    sendJson(res, 200, { ok: true, ...data });
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      supporters: [],
      error: error.message || 'Could not load supporters'
    });
  }
}

async function handleSiteControlRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    sendJson(res, 200, { ok: true, ...readSiteData() });
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const body = await readJsonBody(req, 5 * 1024 * 1024);
    const suppliedPassword = getSuppliedAdminPassword(req, body);

    if (suppliedPassword !== ADMIN_PASSWORD) {
      sendJson(res, 401, { ok: false, error: 'Wrong admin password' });
      return;
    }

    const data = writeSiteData(body.data || body);
    sendJson(res, 200, { ok: true, ...data });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Could not save site control data' });
  }
}

async function handleEventImageUpload(req, res) {
  if (req.method === 'OPTIONS') {
    sendCorsOk(res);
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  if (getSuppliedAdminPassword(req) !== ADMIN_PASSWORD) {
    sendJson(res, 401, { ok: false, error: 'Wrong admin password' });
    return;
  }

  try {
    const extension = imageExtensionFromContentType(req.headers['content-type']);
    if (!extension) {
      sendJson(res, 400, { ok: false, error: 'Only PNG, JPG, JPEG, WEBP, and GIF images are supported' });
      return;
    }

    const imageBuffer = await readRawBody(req);
    if (!imageBuffer.length) {
      sendJson(res, 400, { ok: false, error: 'No image uploaded' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = `event-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    sendJson(res, 200, {
      ok: true,
      imageUrl: `assets/uploads/${fileName}`
    });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Could not upload image' });
  }
}

function injectDiscordStatus(html) {
  const statusText =
    typeof discordGatewayStatus.online === 'number'
      ? `${discordGatewayStatus.online} online`
      : 'bot setup needed';

  return html.replace(
    /(<span id="discordOnline" class="discord-online" aria-live="polite">)(.*?)(<\/span>)/,
    `$1${statusText}$3`
  );
}

function serveIndex(filePath, req, res) {
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) {
      send(res, 500, 'Internal Server Error');
      return;
    }

    const body = injectDiscordStatus(html);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(body);
  });
}

function serveHtmlFile(filePath, req, res) {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      send(res, 404, 'Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(body);
  });
}

function getSafePath(urlPath) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[\\/]+/, '');
  const normalizedPath = path.normalize(requestedPath);
  const filePath = path.join(PUBLIC_DIR, normalizedPath);
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(PUBLIC_DIR, resolvedPath);

  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
    ? resolvedPath
    : null;
}

const server = http.createServer((req, res) => {
  if (!req.url || !['GET', 'HEAD', 'POST', 'OPTIONS'].includes(req.method || '')) {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  const route = req.url.split('?')[0];

  if (route === '/api/feedback') {
    handleFeedbackRequest(req, res);
    return;
  }

  if (route === '/api/admins') {
    handleAdminsRequest(req, res);
    return;
  }

  if (route === '/api/supporters') {
    handleSupportersRequest(req, res);
    return;
  }

  if (route === '/api/site-control') {
    handleSiteControlRequest(req, res);
    return;
  }

  if (route === '/api/upload-event-image') {
    handleEventImageUpload(req, res);
    return;
  }

  if (route === '/admin-rz-26ecu' || route === '/Admin' || route === '/Admin/' || route === '/admin' || route === '/admin/') {
    serveHtmlFile(path.join(PUBLIC_DIR, 'admin-rz-26ecu.html'), req, res);
    return;
  }

  if (route === '/api/discord-status') {
    const isReady = discordGatewayStatus.source === 'discord-gateway' && typeof discordGatewayStatus.online === 'number';
    sendJson(res, isReady ? 200 : 503, discordGatewayStatus);
    return;
  }

  if (route === '/api/discord-status-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.write(`data: ${JSON.stringify(discordGatewayStatus)}\n\n`);

    statusClients.add(res);
    req.on('close', () => {
      statusClients.delete(res);
    });
    return;
  }

  if (route === '/home' || route === '/home/' || route === '/Home' || route === '/Home/') {
    serveIndex(path.join(PUBLIC_DIR, 'index.html'), req, res);
    return;
  }

  const filePath = getSafePath(req.url);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }

    if (path.basename(filePath).toLowerCase() === 'index.html') {
      serveIndex(filePath, req, res);
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        send(res, 416, 'Range Not Satisfiable');
        return;
      }

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stat.size - 1;

      if (start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stat.size}`,
          'X-Content-Type-Options': 'nosniff'
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`RAIDZONE PURGATORY is running at http://${HOST}:${PORT}`);
  console.log(`Open it on this PC: http://127.0.0.1:${PORT}`);
});

startDiscordGateway();
