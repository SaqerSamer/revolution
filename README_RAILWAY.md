# Railway admin data

Set `ADMIN_PASSWORD` in the service variables. Admin login, saving and image uploads
all validate this value on the server. An unset password disables admin writes.
The username is `Admin`. Existing passwords remain unchanged by deployment.

Attach one Railway volume to the website service at `/data`. The server uses
`RAILWAY_VOLUME_MOUNT_PATH` automatically for `site-control.json` and `uploads/`.
Without a volume, Railway filesystem changes do not survive replacement deployments.
For local development, `SITE_DATA_DIR` can override the default `./data` directory.

On an empty volume, the bundled `data/site-control.json` is used until the first save.
Existing bundled images under `assets/uploads/` remain available; new images are
stored on the volume. Back up live site data and images before the first migration.
Subsequent deployments preserve saved volume data instead of overwriting it with
the repository's seed data. JSON saves use an atomic rename.

Run the isolated regression tests with `npm test`.
They verify authorization, saved events and wipe data, uploaded image retrieval,
private-file protection, missing configuration and persistence across restarts.
They also cover live update events, public-page verification, audio byte ranges,
compressed asset caching, and playback cancellation/retry behavior.

## Publishing and performance

Admin saving has two stages: write the data, then fetch both the public API and
the homepage and check their content and revision against the saved snapshot.
Success is shown only after these agree. A verification timeout is reported as
unconfirmed publication, without automatically repeating the write.

The public page embeds the latest data and receives subsequent changes over its
existing server-sent event connection. Hidden pages stop background connections
and refresh when visible. A 30-second visible-page polling fallback is available.

Images use responsive WebP derivatives of the original logo, a 64px favicon and
a compressed background. The original source images remain in the repository.
Text assets are gzip-compressed and cached. HTML references content-versioned
assets, so deployments invalidate updated files without disabling browser caches.
Audio is loaded after an entry/play gesture and supports suffix/open byte ranges.
Mobile/coarse-pointer devices skip the canvas and repeated reveal animations.


## Discord event feed and button fonts
The existing bot reads channel `1507830430987194460` (override `DISCORD_EVENTS_CHANNEL_ID`). It needs View Channel, Read Message History and Message Content enabled in the Discord Developer Portal. No webhook or Discord posting permission is used by this feed.

Guild message notifications trigger a refresh; a 30-second REST poll reconciles new, edited, deleted and missed posts. History is paginated through the last 24 hours. Text and all supported images are imported, mentions are removed, and rich embed announcements are supported. The original message time fixes expiry at 24 hours; edits and deployments do not extend it. API errors retain cached unexpired posts and back off on rate limits. Signed Discord image URLs are refreshed during reconciliation.

The feed cache lives at `discord-events.json` on the existing data volume, separately from admin events. Both server timers and browser timers remove expired posts, including when a mobile tab resumes. Manual events and their save-verification revision remain independent. `/api/discord-events` exposes read-only sync health and the current feed.

Buttons use self-hosted Manrope 700 and Tajawal 700, with Latin, Cyrillic and Arabic WOFF2 subsets (41 KB combined; browsers only load needed subsets). Font licenses are in `assets/fonts`.

All Discord event images use the same automatic size check: images at or below 512 KB stay unchanged on Discord. Larger images are compressed to WebP at quality 85 without resizing or cropping, and the compressed copy is used only if smaller than the original. Copies are cached on the existing data volume; clicking opens the original. Signed URL renewals reuse the same attachment cache. Two workers, a download timeout/size limit, decoder pixel limit and a 25-hour cleanup grace period bound processing and storage. Failed conversions retain the original image and are retried at the next synchronization.
