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
