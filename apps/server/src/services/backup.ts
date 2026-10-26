import { EXPORT_FORMAT, EXPORT_VERSION, type ExportFile, type ImportResult } from '@stacks/shared';
import { inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { items, locations } from '../db/schema';
import type { CoverStore } from './covers';
import { rowToItem } from './items';
import { isNull } from 'drizzle-orm';

export async function exportLibrary(db: Db, covers: CoverStore, includeCovers: boolean): Promise<ExportFile> {
  const locs = db.select().from(locations).all();
  const list = db.select().from(items).where(isNull(items.deletedAt)).all().map(rowToItem);
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    locations: locs.map((l) => ({ id: l.id, name: l.name, parentId: l.parentId, position: l.position })),
    items: list,
  };
  if (includeCovers) {
    file.covers = {};
    for (const item of list) {
      if (item.cover && (await covers.exists(item.cover))) {
        file.covers[item.cover] = (await covers.read(item.cover)).toString('base64');
      }
    }
  }
  return file;
}

/** Adds everything from an export that isn't already in the library. Existing ids are left untouched. */
export async function importLibrary(db: Db, covers: CoverStore, file: ExportFile): Promise<ImportResult> {
  let coverCount = 0;
  for (const [name, data] of Object.entries(file.covers ?? {})) {
    try {
      await covers.restore(name, Buffer.from(data, 'base64'));
      coverCount++;
    } catch {
      // unreadable cover: the item is imported without it
    }
  }
  const availableCovers = new Set<string>();
  for (const item of file.items) {
    if (item.cover && (await covers.exists(item.cover))) availableCovers.add(item.cover);
  }

  return db.transaction((tx) => {
    const existingLocs = new Set(
      file.locations.length
        ? tx
            .select({ id: locations.id })
            .from(locations)
            .where(
              inArray(
                locations.id,
                file.locations.map((l) => l.id),
              ),
            )
            .all()
            .map((r) => r.id)
        : [],
    );
    const known = new Set(
      tx
        .select({ id: locations.id })
        .from(locations)
        .all()
        .map((r) => r.id),
    );
    // Insert parents before children.
    const pending = file.locations.filter((l) => !existingLocs.has(l.id));
    let addedLocs = 0;
    let progress = true;
    while (pending.length && progress) {
      progress = false;
      for (let i = pending.length - 1; i >= 0; i--) {
        const l = pending[i]!;
        const parentInFile = l.parentId && pending.some((p) => p.id === l.parentId);
        if (parentInFile) continue;
        tx.insert(locations)
          .values({
            id: l.id,
            name: l.name,
            parentId: l.parentId && known.has(l.parentId) ? l.parentId : null,
            position: l.position,
            createdAt: new Date().toISOString(),
          })
          .run();
        known.add(l.id);
        pending.splice(i, 1);
        addedLocs++;
        progress = true;
      }
    }

    const existingItems = new Set(
      file.items.length
        ? tx
            .select({ id: items.id })
            .from(items)
            .where(
              inArray(
                items.id,
                file.items.map((i) => i.id),
              ),
            )
            .all()
            .map((r) => r.id)
        : [],
    );
    let added = 0;
    for (const item of file.items) {
      if (existingItems.has(item.id)) continue;
      const { loan, ...rest } = item;
      tx.insert(items)
        .values({
          ...rest,
          locationId: item.locationId && known.has(item.locationId) ? item.locationId : null,
          cover: item.cover && availableCovers.has(item.cover) ? item.cover : null,
          loanTo: loan ? loan.to : null,
          loanSince: loan ? loan.since : null,
        })
        .run();
      added++;
    }
    return { locations: addedLocs, items: added, skipped: file.items.length - added, covers: coverCount };
  });
}
