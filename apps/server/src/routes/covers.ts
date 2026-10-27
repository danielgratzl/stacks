import { coverImportSchema, coverSearchSchema } from '@stacks/shared';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { AppError } from '../lib/errors';
import { validate } from '../lib/validate';
import type { CoverSearch } from '../services/cover-search';
import type { CoverStore } from '../services/covers';
import { fetchImage, type FetchImageOptions } from '../services/safe-fetch';

const MAX_UPLOAD = 25 * 1024 * 1024;

export function coverRoutes(covers: CoverStore, importOptions: FetchImageOptions, search: CoverSearch) {
  return new Hono()
    .get('/search', validate('query', coverSearchSchema), async (c) =>
      c.json({ results: await search.search(c.req.valid('query')) }),
    )
    .post(
      '/',
      bodyLimit({
        maxSize: MAX_UPLOAD,
        onError: () => {
          throw new AppError(413, 'too_large', 'That image is too large. Try one under 25 MB.');
        },
      }),
      async (c) => {
        const body = await c.req.parseBody();
        const file = body.file;
        if (!(file instanceof File)) throw new AppError(400, 'missing_file', 'Choose an image to upload.');
        return c.json(await covers.save(Buffer.from(await file.arrayBuffer())), 201);
      },
    )
    .post('/import', validate('json', coverImportSchema), async (c) => {
      const data = await fetchImage(c.req.valid('json').url, importOptions);
      return c.json(await covers.save(data), 201);
    });
}

/** Serves cover files. Names are content-unique, so they can be cached forever. */
export function coverFiles(covers: CoverStore) {
  return new Hono().get('/:name', async (c) => {
    const name = c.req.param('name');
    if (!(await covers.exists(name))) return c.notFound();
    return c.body(new Uint8Array(await covers.read(name)), 200, {
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    });
  });
}
