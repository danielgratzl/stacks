import { idSchema, locationCreateSchema, locationPatchSchema } from '@stacks/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { validate } from '../lib/validate';
import type { LocationService } from '../services/locations';

const params = z.object({ id: idSchema });

export function locationRoutes(service: LocationService) {
  return new Hono()
    .get('/', (c) => c.json({ locations: service.list() }))
    .post('/', validate('json', locationCreateSchema), (c) =>
      c.json(service.create(c.req.valid('json')), 201),
    )
    .patch('/:id', validate('param', params), validate('json', locationPatchSchema), (c) =>
      c.json(service.update(c.req.valid('param').id, c.req.valid('json'))),
    )
    .delete('/:id', validate('param', params), (c) => c.json(service.remove(c.req.valid('param').id)));
}
