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

Run the isolated regression test with `node --test test/admin-save.test.js`.
It verifies authorization, saved events and wipe data, uploaded image retrieval,
private-file protection, missing configuration and persistence across restarts.
