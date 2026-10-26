import { idSchema, itemCreateSchema, itemPatchSchema } from '@stacks/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { validate } from '../lib/validate';
import type { ItemService } from '../services/items';

const params = z.object({ id: idSchema });

export function itemRoutes(service: ItemService) {
  return new Hono()
    .get('/', (c) => c.json({ items: service.list() }))
    .get('/:id', validate('param', params), (c) => c.json(service.get(c.req.valid('param').id)))
    .post('/', validate('json', itemCreateSchema), async (c) =>
      c.json(await service.create(c.req.valid('json')), 201),
    )
    .patch('/:id', validate('param', params), validate('json', itemPatchSchema), async (c) =>
      c.json(await service.update(c.req.valid('param').id, c.req.valid('json'))),
    )
    .delete('/:id', validate('param', params), (c) => {
      service.remove(c.req.valid('param').id);
      return c.body(null, 204);
    })
    .post('/:id/restore', validate('param', params), (c) => c.json(service.restore(c.req.valid('param').id)));
}
