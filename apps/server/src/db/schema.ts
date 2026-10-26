import type { ItemStatus, MediaType } from '@stacks/shared';
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => locations.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('locations_parent_idx').on(t.parentId)],
);

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<MediaType>().notNull(),
    status: text('status').$type<ItemStatus>().notNull().default('owned'),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull().default(''),
    creators: text('creators', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    publisher: text('publisher').notNull().default(''),
    originalYear: integer('original_year'),
    editionYear: integer('edition_year'),
    seriesName: text('series_name').notNull().default(''),
    seriesNumber: text('series_number').notNull().default(''),
    locationId: text('location_id').references(() => locations.id, { onDelete: 'set null' }),
    language: text('language').notNull().default(''),
    barcode: text('barcode').notNull().default(''),
    cover: text('cover'),
    tags: text('tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    notes: text('notes').notNull().default(''),
    loanTo: text('loan_to'),
    loanSince: text('loan_since'),
    addedAt: text('added_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('items_type_status_idx').on(t.type, t.status),
    index('items_location_idx').on(t.locationId),
    index('items_barcode_idx').on(t.barcode),
    index('items_deleted_idx').on(t.deletedAt),
  ],
);

export type ItemRow = typeof items.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
