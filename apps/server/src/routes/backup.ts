import { exportSchema } from '@stacks/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { AppError } from '../lib/errors';
import { validate } from '../lib/validate';
import type { Db } from '../db/client';
import { exportLibrary, importLibrary } from '../services/backup';
import type { CoverStore } from '../services/covers';
import type { ItemService } from '../services/items';

export function backupRoutes(db: Db, covers: CoverStore, itemService: ItemService) {
  return new Hono()
    .get('/export', async (c) => {
      const withCovers = c.req.query('covers') !== 'false';
      const file = await exportLibrary(db, covers, withCovers);
      const date = file.exportedAt.slice(0, 10);
      c.header('content-disposition', `attachment; filename="stacks-${date}.json"`);
      return c.json(file);
    })
    .post(
      '/import',
      bodyLimit({
        maxSize: 1024 * 1024 * 1024,
        onError: () => {
          throw new AppError(413, 'too_large', 'That backup is too large to import.');
        },
      }),
      validate('json', exportSchema),
      async (c) => {
        const result = await importLibrary(db, covers, c.req.valid('json'));
        await itemService.backfillCoverColors();
        return c.json(result);
      },
    );
}
