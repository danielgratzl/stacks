# Stacks

A personal media library for books and vinyl. Catalogue what you own, where it lives, what you’ve lent out and what you’re still hoping to find.

- **Books and vinyl** with covers, creators, publisher or label, original and edition year, language, barcode, tags and notes.
- **Series** for books, in order, with missing numbers called out.
- **Locations** as a simple hierarchy, e.g. Living room › Shelf › Top.
- **Wishlist**, kept separate from the collection.
- **Lending**, with who has an item and since when.
- **Covers** by upload, drag and drop, paste, import from a link, or a web search (Open Library and Apple Books for books, Apple Music and Deezer for vinyl).
- **Sort by cover color**, for a rainbow shelf. Each cover's main color is detected automatically, including for covers added before this feature.
- **Backups** as a single JSON file that includes the covers.

It is a single-user app with no login. Run it on your own machine or home server, behind your own network or reverse proxy.

## Quick start

Requires Docker with the Compose plugin.

```sh
cp .env.example .env   # optional: change the port or time zone
docker compose up -d --build
```

Open <http://localhost:8080>. Data is stored in the `stacks-data` volume.

To update after pulling new code, run `docker compose up -d --build` again. Database migrations run automatically on start.

### Prebuilt image

Images for `linux/amd64` and `linux/arm64` are published to the GitHub Container Registry:

- `ghcr.io/danielgratzl/stacks:latest` is the latest commit on `main`.
- `:1.2.3`, `:1.2` and `:1` are releases and follow that version line.

To use one instead of building locally, set `image:` in `compose.yaml` to the tag you want, remove the `build: .` line, and run `docker compose pull && docker compose up -d`.

Images are only published once the checks pass. Pushing a `v*.*.*` tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) publishes a release.

## Configuration

Compose reads these from `.env`. The server reads them from its environment.

| Variable                     | Default             | Description                                                                     |
| ---------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `STACKS_PORT`                | `8080`              | Host port (Compose only).                                                       |
| `PORT`                       | `3000`              | Port the server listens on inside the container.                                |
| `HOST`                       | `0.0.0.0`           | Interface the server binds to.                                                  |
| `DATA_DIR`                   | `/data` (container) | Where the database (`stacks.db`) and covers (`covers/`) are stored.             |
| `COVER_IMPORT_ALLOW_PRIVATE` | `false`             | Allow cover imports from private or local network addresses, for example a NAS. |
| `COVER_IMPORT_MAX_BYTES`     | `15728640`          | Largest image that can be imported from a link (15 MB).                         |
| `TZ`                         | `UTC`               | Container time zone (Compose only).                                             |

## Data and backups

Everything lives in `DATA_DIR`:

```
/data
├── stacks.db        SQLite database (WAL mode)
└── covers/          WebP cover images, named by id
```

There are two ways to back up:

1. **From the app:** Settings › Your data › Export downloads one JSON file with items, locations and covers. Import adds anything not already in the library and leaves existing items untouched.
2. **From the volume:** copy the database safely while the app runs, then copy the covers folder.

   ```sh
   docker compose exec stacks node -e "require('better-sqlite3')('/data/stacks.db').backup('/data/stacks-backup.db').then(()=>console.log('done'))"
   docker compose cp stacks:/data ./stacks-backup
   ```

Deleted items can be restored with Undo and are removed for good after 30 days. Cover files no item uses are cleaned up after a day.

## HTTPS and remote access

Stacks serves plain HTTP. If you want to reach it from outside your home network, or use the camera for barcode scanning on a phone (browsers only allow the camera on HTTPS pages), put it behind a reverse proxy that terminates TLS, such as Caddy, Traefik or nginx. There is no login, so don’t expose it to the internet without putting authentication in front of it (for example your proxy’s basic auth, or an identity-aware proxy).

## Development

Requires Node 22.12 or newer and pnpm (`corepack enable` sets up the right version).

```sh
pnpm install
pnpm dev          # server on :3000, web app with hot reload on :5173
```

Open <http://localhost:5173>. Vite proxies `/api` and `/covers` to the server, and development data goes to `apps/server/data`.

| Script           | What it does                                          |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Run server and web app in watch mode.                 |
| `pnpm build`     | Build the web app and bundle the server.              |
| `pnpm test`      | Run unit and API tests (Vitest).                      |
| `pnpm typecheck` | Type-check every package.                             |
| `pnpm lint`      | Lint with ESLint.                                     |
| `pnpm format`    | Format with Prettier.                                 |
| `pnpm check`     | Everything CI runs: format check, lint, types, tests. |

### Project layout

```
apps/
  server/            Hono API, SQLite via Drizzle, cover processing
    drizzle/         SQL migrations (generated, committed)
    src/routes/      HTTP endpoints
    src/services/    Domain logic, cover storage, safe URL fetching, backups
    test/            API tests against an in-memory database
  web/               React app (Vite, Tailwind v4, shadcn/ui)
    src/components/  Item form, cover picker, item sheet, cards, shell
    src/components/ui/  shadcn/ui primitives
    src/routes/      Overview, Books (with Series), Vinyl, Wishlist, Lent out, Settings
    src/lib/         API client, query hooks, URL-driven sheet state
packages/
  shared/            Zod schemas, types and helpers used by server and web
docs/
  adr/               Architecture decision records
  barcode-lookup.md  Plan for barcode scanning and metadata lookup
```

### Changing the database

Edit `apps/server/src/db/schema.ts`, then generate a migration and commit it:

```sh
pnpm --filter @stacks/server db:generate --name describe-the-change
```

Migrations are applied automatically when the server starts.

### Adding UI components

`apps/web/components.json` is set up for the shadcn CLI, so you can add more components with `pnpm dlx shadcn@latest add <component>` from `apps/web`.

## API

JSON over HTTP under `/api`. Errors use `{ "error": { "code", "message", "fields"? } }`.

| Method | Path                     | Purpose                                                          |
| ------ | ------------------------ | ---------------------------------------------------------------- |
| GET    | `/api/items`             | All items (collection and wishlist).                             |
| POST   | `/api/items`             | Create an item.                                                  |
| GET    | `/api/items/:id`         | One item.                                                        |
| PATCH  | `/api/items/:id`         | Update some fields.                                              |
| DELETE | `/api/items/:id`         | Delete (restorable).                                             |
| POST   | `/api/items/:id/restore` | Undo a delete.                                                   |
| GET    | `/api/locations`         | All locations.                                                   |
| POST   | `/api/locations`         | Create a location.                                               |
| PATCH  | `/api/locations/:id`     | Rename or move a location.                                       |
| DELETE | `/api/locations/:id`     | Delete a location and its children; items move to the parent.    |
| POST   | `/api/covers`            | Upload a cover (multipart, field `file`). Returns `{ cover }`.   |
| POST   | `/api/covers/import`     | Import a cover from `{ url }`. Returns `{ cover }`.              |
| GET    | `/api/covers/search`     | Find covers online (`?type=&source=&q=`). Returns `{ results }`. |
| GET    | `/covers/:name`          | A stored cover image.                                            |
| GET    | `/api/export`            | Download a backup (`?covers=false` to leave covers out).         |
| POST   | `/api/import`            | Restore from a backup.                                           |
| GET    | `/api/health`            | Health check.                                                    |

## License

Not yet chosen. Add a `LICENSE` file before publishing the repository.
