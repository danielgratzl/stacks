import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Config } from './config';
import type { Db } from './db/client';
import { AppError } from './lib/errors';
import { backupRoutes } from './routes/backup';
import { coverFiles, coverRoutes } from './routes/covers';
import { itemRoutes } from './routes/items';
import { locationRoutes } from './routes/locations';
import { COVER_IMAGE_HOSTS, CoverSearch } from './services/cover-search';
import type { CoverStore } from './services/covers';
import { ItemService } from './services/items';
import { LocationService } from './services/locations';

export interface AppDeps {
  db: Db;
  covers: CoverStore;
  coverSearch?: CoverSearch;
  config: Pick<Config, 'webDir' | 'coverImport'>;
}

export function createApp({ db, covers, coverSearch = new CoverSearch(), config }: AppDeps) {
  const itemService = new ItemService({
    db,
    coverExists: (n) => covers.exists(n),
    coverColor: (n) => covers.dominantColor(n),
  });
  const locationService = new LocationService(db);

  const app = new Hono();

  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        // Remote hosts are for cover search thumbnails; chosen covers are imported and served from here.
        imgSrc: ["'self'", 'data:', 'blob:', ...COVER_IMAGE_HOSTS],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
      // Camera access is needed later for barcode scanning.
      permissionsPolicy: { camera: ['self'], microphone: [], geolocation: [] },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: { code: err.code, message: err.message, fields: err.fields } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: 'internal', message: 'Something went wrong on the server.' } }, 500);
  });

  const api = new Hono()
    .get('/health', (c) => c.json({ status: 'ok' }))
    .route('/items', itemRoutes(itemService))
    .route('/locations', locationRoutes(locationService))
    .route('/covers', coverRoutes(covers, config.coverImport, coverSearch))
    .route('/', backupRoutes(db, covers, itemService));
  api.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404));

  app.route('/api', api);
  app.route('/covers', coverFiles(covers));

  // Serve the built web app, with client-side routing fallback.
  if (existsSync(join(config.webDir, 'index.html'))) {
    const root = relative(process.cwd(), config.webDir) || '.';
    app.use(
      '/assets/*',
      serveStatic({
        root,
        onFound: (_path, c) => c.header('cache-control', 'public, max-age=31536000, immutable'),
      }),
    );
    app.use('*', serveStatic({ root, onFound: (_p, c) => c.header('cache-control', 'no-cache') }));
    app.get(
      '*',
      serveStatic({ root, path: 'index.html', onFound: (_p, c) => c.header('cache-control', 'no-cache') }),
    );
  }

  return { app, itemService };
}

export type ApiRoutes = ReturnType<typeof createApp>['app'];
