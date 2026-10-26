import { locationSubtree, type Location, type LocationCreate, type LocationPatch } from '@stacks/shared';
import { eq, inArray, isNull, max } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../db/client';
import { items, locations } from '../db/schema';
import { AppError, notFound } from '../lib/errors';

const toLocation = (r: typeof locations.$inferSelect): Location => ({
  id: r.id,
  name: r.name,
  parentId: r.parentId,
  position: r.position,
});

export class LocationService {
  constructor(private readonly db: Db) {}

  list(): Location[] {
    return this.db.select().from(locations).all().map(toLocation);
  }

  get(id: string): Location {
    const row = this.db.select().from(locations).where(eq(locations.id, id)).get();
    if (!row) throw notFound('Location');
    return toLocation(row);
  }

  private nextPosition(parentId: string | null): number {
    const row = this.db
      .select({ value: max(locations.position) })
      .from(locations)
      .where(parentId ? eq(locations.parentId, parentId) : isNull(locations.parentId))
      .get();
    return row?.value == null ? 0 : row.value + 1;
  }

  create(input: LocationCreate): Location {
    const parentId = input.parentId ?? null;
    if (parentId) this.get(parentId);
    const id = randomUUID();
    this.db
      .insert(locations)
      .values({
        id,
        name: input.name.trim(),
        parentId,
        position: this.nextPosition(parentId),
        createdAt: new Date().toISOString(),
      })
      .run();
    return this.get(id);
  }

  update(id: string, patch: LocationPatch): Location {
    const current = this.get(id);
    const set: Partial<typeof locations.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name.trim();
    if (patch.position !== undefined) set.position = patch.position;
    if (patch.parentId !== undefined && patch.parentId !== current.parentId) {
      if (patch.parentId) {
        this.get(patch.parentId);
        if (locationSubtree(this.list(), id).has(patch.parentId)) {
          throw new AppError(422, 'invalid_parent', 'A location can’t be moved inside itself.', {
            parentId: 'A location can’t be moved inside itself.',
          });
        }
      }
      set.parentId = patch.parentId;
      if (patch.position === undefined) set.position = this.nextPosition(patch.parentId);
    }
    if (Object.keys(set).length) this.db.update(locations).set(set).where(eq(locations.id, id)).run();
    return this.get(id);
  }

  /** Deletes a location and everything nested in it; items move up to the parent. */
  remove(id: string): { deleted: string[]; movedItems: number } {
    const target = this.get(id);
    const subtree = [...locationSubtree(this.list(), id)];
    return this.db.transaction((tx) => {
      const moved = tx
        .update(items)
        .set({ locationId: target.parentId, updatedAt: new Date().toISOString() })
        .where(inArray(items.locationId, subtree))
        .run().changes;
      tx.delete(locations).where(eq(locations.id, id)).run();
      return { deleted: subtree, movedItems: moved };
    });
  }
}
