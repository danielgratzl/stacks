# 1. Technology stack

- Status: accepted
- Date: 2026-10-26

## Context

Stacks is a personal media library for books and vinyl. Requirements that shape the stack:

- One user, no authentication for the foreseeable future.
- Deployed as a single Docker container with a Compose file, on a home server or NAS, including ARM machines.
- Persistent data that is easy to back up and restore.
- A polished, responsive web UI built on shadcn/ui, with micro-interactions.
- Cover images from uploads and from web links.
- Later: barcode scanning with a phone camera in the browser, and metadata lookup against free APIs (see [barcode-lookup.md](../barcode-lookup.md)).

## Decision

**One language, one repository.** TypeScript everywhere in a pnpm workspace with three packages: `apps/server`, `apps/web` and `packages/shared`. The shared package holds Zod schemas, types and domain helpers (series gaps, location paths), so validation rules are written once and enforced on both sides.

**Server: Node 22 with Hono.** Hono is small, fast and fully typed, with first-class Zod validation. The server serves both the API and the built web app, so the container runs a single process.

**Database: SQLite through Drizzle ORM (better-sqlite3).** For a single user, an embedded database is the right size: no second container, no connection management, and a backup is a file copy. WAL mode gives safe concurrent reads. Drizzle provides typed queries and generated SQL migrations that are committed and applied at start-up. Arrays (creators, tags) are stored as JSON columns; at personal-library scale this is simpler than join tables and still queryable with `json_each` if needed.

**Images: sharp, stored as files.** Every cover is decoded and re-encoded to a size-limited WebP. That keeps storage predictable, strips metadata such as GPS, and means the server only ever serves images it produced. Files are named with random UUIDs and served with immutable caching.

**Cover import from links runs on the server** with SSRF protection: only http(s), private and loopback addresses refused (checked at connect time through a custom DNS lookup, which also closes DNS-rebinding gaps), limits on size, time and redirects, and an opt-in for LAN sources.

**Web: React 19, Vite, Tailwind v4, shadcn/ui (Radix), TanStack Query, React Router.** shadcn/ui gives accessible primitives we own and can restyle. TanStack Query handles caching and optimistic updates, which makes edits, lending and undo feel instant. The item sheet is driven by URL search params, so items are linkable and the back button closes it.

**Client-side filtering.** The web app loads the whole library once and filters in memory. A personal collection of a few thousand items is a few hundred kilobytes of JSON, and in-memory search is instant. If libraries grow much larger, add server-side search with SQLite FTS5 behind the same UI.

**Soft deletes.** Deleting sets `deleted_at`, so the UI can offer Undo; rows are purged after 30 days.

**Packaging.** A multi-stage Dockerfile on `node:22-bookworm-slim` (glibc, so prebuilt `better-sqlite3` and `sharp` binaries work on amd64 and arm64). `pnpm deploy --prod` produces a pruned runtime. The container runs as a non-root user, has a health check and keeps all state in `/data`.

## Alternatives considered

- **Next.js or Remix.** Server rendering adds little to a single-user tool behind a login-free LAN service, and a plain SPA plus a small API is simpler to run and reason about.
- **PostgreSQL.** More capable, but a second container and a heavier backup story for no benefit at this scale.
- **PocketBase or a similar backend-in-a-box.** Fast to start, but less control over cover processing, lookups and the data model, and a second language for custom logic.
- **Storing covers in the database.** Makes the database large and backups slower; files on the same volume are simpler and cacheable.
- **Python (FastAPI) server.** Equally viable, but a single language lets the server and client share validation and types.

## Consequences

- Backups are simple: the in-app export, or copy the `/data` volume.
- The server is single-process and single-writer, which is fine for one user. Running several replicas against the same volume is not supported.
- Native modules (`better-sqlite3`, `sharp`) tie the image to glibc; Alpine would need source builds.
- Adding authentication later means adding a session layer to Hono and a login screen; the API is already behind a single `/api` prefix to make that straightforward.
