import {
  ITEM_DEFAULTS,
  normalizeItem,
  validateItem,
  type Item,
  type ItemCreate,
  type ItemFields,
  type ItemPatch,
} from '@stacks/shared';
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../db/client';
import { items, locations, type ItemRow } from '../db/schema';
import { AppError, notFound } from '../lib/errors';

export function rowToItem(row: ItemRow): Item {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    subtitle: row.subtitle,
    creators: row.creators,
    publisher: row.publisher,
    originalYear: row.originalYear,
    editionYear: row.editionYear,
    seriesName: row.seriesName,
    seriesNumber: row.seriesNumber,
    locationId: row.locationId,
    language: row.language,
    barcode: row.barcode,
    cover: row.cover,
    tags: row.tags,
    notes: row.notes,
    loan: row.loanSince ? { to: row.loanTo ?? '', since: row.loanSince } : null,
    addedAt: row.addedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function fieldsToRow(f: ItemFields) {
  const { loan, ...rest } = f;
  return { ...rest, loanTo: loan ? loan.to : null, loanSince: loan ? loan.since : null };
}

export interface ItemServiceDeps {
  db: Db;
  coverExists: (name: string) => Promise<boolean>;
}

export class ItemService {
  constructor(private readonly deps: ItemServiceDeps) {}

  private get db() {
    return this.deps.db;
  }

  list(): Item[] {
    return this.db.select().from(items).where(isNull(items.deletedAt)).all().map(rowToItem);
  }

  get(id: string): Item {
    const row = this.db
      .select()
      .from(items)
      .where(and(eq(items.id, id), isNull(items.deletedAt)))
      .get();
    if (!row) throw notFound('Item');
    return rowToItem(row);
  }

  private async check(fields: ItemFields): Promise<ItemFields> {
    const normalized = normalizeItem(fields);
    const errors: Record<string, string> = { ...validateItem(normalized) };
    if (normalized.locationId) {
      const exists = this.db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, normalized.locationId))
        .get();
      if (!exists) errors.locationId = 'That location no longer exists.';
    }
    if (normalized.cover && !(await this.deps.coverExists(normalized.cover))) {
      errors.cover = 'That cover image is missing. Try adding it again.';
    }
    if (Object.keys(errors).length) {
      throw new AppError(422, 'invalid_item', 'Some fields need attention.', errors);
    }
    return normalized;
  }

  async create(input: ItemCreate & { title: string }): Promise<Item> {
    const fields = await this.check({ ...ITEM_DEFAULTS, ...input } as ItemFields);
    const now = new Date().toISOString();
    const id = randomUUID();
    this.db
      .insert(items)
      .values({ id, ...fieldsToRow(fields), addedAt: now, createdAt: now, updatedAt: now })
      .run();
    return this.get(id);
  }

  async update(id: string, patch: ItemPatch): Promise<Item> {
    const current = this.get(id);
    const { id: _id, addedAt, createdAt: _c, updatedAt: _u, ...currentFields } = current;
    const fields = await this.check({ ...currentFields, ...patch } as ItemFields);
    const now = new Date().toISOString();
    this.db
      .update(items)
      .set({
        ...fieldsToRow(fields),
        // Entering the collection (or the wishlist) counts as being added to it.
        addedAt: fields.status !== current.status ? now : addedAt,
        updatedAt: now,
      })
      .where(eq(items.id, id))
      .run();
    return this.get(id);
  }

  /** Soft delete, so the client can offer undo. Purged after the retention period. */
  remove(id: string): void {
    this.get(id);
    this.db.update(items).set({ deletedAt: new Date().toISOString() }).where(eq(items.id, id)).run();
  }

  restore(id: string): Item {
    const row = this.db.select().from(items).where(eq(items.id, id)).get();
    if (!row) throw notFound('Item');
    this.db.update(items).set({ deletedAt: null }).where(eq(items.id, id)).run();
    return this.get(id);
  }

  purgeDeleted(olderThan: Date): number {
    return this.db
      .delete(items)
      .where(and(isNotNull(items.deletedAt), lt(items.deletedAt, olderThan.toISOString())))
      .run().changes;
  }

  /** Every cover file referenced by any row, including soft-deleted ones. */
  referencedCovers(): Set<string> {
    const rows = this.db.select({ cover: items.cover }).from(items).where(isNotNull(items.cover)).all();
    return new Set(rows.map((r) => r.cover!));
  }
}
