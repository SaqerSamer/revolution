RAIDZONE PURGATORY - Namecheap Node.js Deploy

Important:
SiteLock is not where you upload or run this website.
Use Namecheap cPanel instead.

Recommended cPanel values:
- Node.js version: 18.x or newer
- Application mode: Production
- Application root: raidzone-purgatory
- Application URL: raidzonepurgatory.online
- Application startup file: app.js
- Run NPM install / Install dependencies after uploading

Environment variables to add in Setup Node.js App:
- DISCORD_BOT_TOKEN = your Discord bot token
- DISCORD_GUILD_ID = 1506948630903521290
- DISCORD_FEEDBACK_CHANNEL_ID = 1506948631360442411
- DISCORD_ADMIN_ROLE_ID = 1506948630920167458
- DISCORD_SUPPORTER_ROLE_ID = 1506948630907457714
- ADMIN_PASSWORD = AlamouriVivi
- HOST = 0.0.0.0

Do not upload the real .env file to public folders.
The upload package intentionally excludes node_modules, logs, Cloudflare files, screenshots, and the real .env file.

After deploy:
- Open https://raidzonepurgatory.online
- Open https://raidzonepurgatory.online/Admin
- Login with username Admin and password AlamouriVivi
- Save one Wipe test and check that data/site-control.json updates through the site
