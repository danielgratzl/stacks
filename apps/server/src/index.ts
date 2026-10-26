import { serve } from '@hono/node-server';
import { mkdirSync } from 'node:fs';
import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/client';
import { CoverStore } from './services/covers';

const DELETED_RETENTION_MS = 30 * 24 * 3600 * 1000;
const ORPHAN_GRACE_MS = 24 * 3600 * 1000;
const MAINTENANCE_INTERVAL_MS = 6 * 3600 * 1000;

async function main() {
  const config = loadConfig();
  mkdirSync(config.dataDir, { recursive: true });
  const database = openDatabase(config.dbFile, config.migrationsDir);
  const covers = new CoverStore(config.coversDir);
  await covers.init();

  const { app, itemService } = createApp({ db: database.db, covers, config });

  const maintenance = async () => {
    try {
      const purged = itemService.purgeDeleted(new Date(Date.now() - DELETED_RETENTION_MS));
      const removed = await covers.removeOrphans(itemService.referencedCovers(), ORPHAN_GRACE_MS);
      if (purged || removed)
        console.log(`maintenance: purged ${purged} deleted items, ${removed} unused covers`);
    } catch (error) {
      console.error('maintenance failed', error);
    }
  };
  await maintenance();
  const timer = setInterval(maintenance, MAINTENANCE_INTERVAL_MS);
  timer.unref();

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    console.log(`Stacks listening on http://${info.address}:${info.port} (data in ${config.dataDir})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    clearInterval(timer);
    server.close(() => {
      database.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
