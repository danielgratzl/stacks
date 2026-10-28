import { z } from 'zod';

export const MEDIA_TYPES = ['book', 'vinyl'] as const;
export const ITEM_STATUSES = ['owned', 'wishlist'] as const;
export const READ_STATUSES = ['unread', 'want-to-read', 'read'] as const;

export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export const itemStatusSchema = z.enum(ITEM_STATUSES);
export const readStatusSchema = z.enum(READ_STATUSES);

export const idSchema = z.string().uuid();
/** Cover files are stored under server-generated names. */
export const coverFileSchema = z.string().regex(/^[a-f0-9-]{36}\.webp$/, 'Invalid cover reference');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const text = (max: number) => z.string().trim().max(max);
const year = z.number().int().min(0).max(9999).nullable();
const list = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems)
    // de-duplicate case-insensitively, keep first spelling
    .transform((values) => {
      const seen = new Set<string>();
      return values.filter((v) => {
        const key = v.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

export const loanSchema = z.object({
  to: text(200).default(''),
  since: isoDateSchema,
});

/** All user-editable fields of an item. No defaults: used for partial updates. */
export const itemFieldsSchema = z.object({
  type: mediaTypeSchema,
  status: itemStatusSchema,
  title: z.string().trim().min(1, 'Title is required').max(500),
  subtitle: text(500),
  creators: list(50, 200),
  publisher: text(200),
  originalYear: year,
  editionYear: year,
  seriesName: text(200),
  seriesNumber: text(20),
  locationId: idSchema.nullable(),
  language: text(80),
  barcode: text(64),
  cover: coverFileSchema.nullable(),
  tags: list(100, 60),
  notes: text(20_000),
  loan: loanSchema.nullable(),
  /** Books only; always 'unread' for other media. */
  readStatus: readStatusSchema,
});

export const itemCreateSchema = itemFieldsSchema.partial().extend({
  type: mediaTypeSchema,
  title: itemFieldsSchema.shape.title,
});
export const itemPatchSchema = itemFieldsSchema.partial();

export type MediaType = z.infer<typeof mediaTypeSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type ReadStatus = z.infer<typeof readStatusSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type ItemFields = z.infer<typeof itemFieldsSchema>;
export type ItemCreate = z.input<typeof itemCreateSchema>;
export type ItemPatch = z.input<typeof itemPatchSchema>;

export interface Item extends ItemFields {
  id: string;
  /** Dominant cover color as `#rrggbb`, derived by the server; null without a cover. */
  coverColor: string | null;
  /** When the item entered its current list (collection or wishlist). */
  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const ITEM_DEFAULTS: Omit<ItemFields, 'type' | 'title'> = {
  status: 'owned',
  subtitle: '',
  creators: [],
  publisher: '',
  originalYear: null,
  editionYear: null,
  seriesName: '',
  seriesNumber: '',
  locationId: null,
  language: '',
  barcode: '',
  cover: null,
  tags: [],
  notes: '',
  loan: null,
  readStatus: 'unread',
};

/**
 * Cross-field rules shared by client and server. Returns a field → message map.
 */
export function validateItem(item: ItemFields): Partial<Record<keyof ItemFields, string>> {
  const errors: Partial<Record<keyof ItemFields, string>> = {};
  if (item.originalYear != null && item.editionYear != null && item.editionYear < item.originalYear) {
    errors.editionYear = 'The edition can’t be older than the original.';
  }
  if (item.status === 'wishlist' && item.loan) {
    errors.loan = 'Wishlist items can’t be lent out.';
  }
  return errors;
}

/** Normalises fields that depend on others (e.g. wishlist items have no location). */
export function normalizeItem<T extends ItemFields>(item: T): T {
  const out = { ...item };
  if (out.status === 'wishlist') {
    out.locationId = null;
    out.loan = null;
  }
  if (out.type !== 'book') {
    out.seriesName = '';
    out.seriesNumber = '';
    out.readStatus = 'unread';
  }
  if (!out.seriesName) out.seriesNumber = '';
  return out;
}

export const locationNameSchema = z.string().trim().min(1, 'Name is required').max(120);

export const locationCreateSchema = z.object({
  name: locationNameSchema,
  parentId: idSchema.nullable().default(null),
});
export const locationPatchSchema = z.object({
  name: locationNameSchema.optional(),
  parentId: idSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export interface Location {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
}

export type LocationCreate = z.input<typeof locationCreateSchema>;
export type LocationPatch = z.input<typeof locationPatchSchema>;

export const coverImportSchema = z.object({
  url: z.string().trim().url('Enter a full web address, starting with https://').max(2048),
});

export const COVER_SOURCES = ['openlibrary', 'apple', 'deezer'] as const;
export type CoverSource = (typeof COVER_SOURCES)[number];
/** Sources searched for each media type, fastest first so slower ones append below. */
export const COVER_SOURCES_FOR: Record<MediaType, CoverSource[]> = {
  book: ['apple', 'openlibrary'],
  vinyl: ['apple', 'deezer'],
};

export const coverSearchSchema = z.object({
  type: mediaTypeSchema,
  source: z.enum(COVER_SOURCES),
  q: z.string().trim().min(1, 'Enter a title to search for').max(300),
});
export type CoverSearchQuery = z.infer<typeof coverSearchSchema>;

/** A cover found online. Importing `imageUrl` stores it like any other linked image. */
export interface CoverCandidate {
  source: CoverSource;
  title: string;
  creator: string;
  year: number | null;
  thumbnailUrl: string;
  imageUrl: string;
}

export interface CoverUploadResult {
  cover: string;
  width: number;
  height: number;
}

export const EXPORT_FORMAT = 'stacks-export';
export const EXPORT_VERSION = 1;

export const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  locations: z.array(
    z.object({
      id: idSchema,
      name: locationNameSchema,
      parentId: idSchema.nullable(),
      position: z.number().int(),
    }),
  ),
  items: z.array(
    itemFieldsSchema.extend({
      // added after version 1 shipped; older files have none
      readStatus: readStatusSchema.default('unread'),
      id: idSchema,
      addedAt: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  /** Cover files keyed by file name, base64 encoded. Optional. */
  covers: z.record(coverFileSchema, z.string()).optional(),
});
export type ExportFile = z.infer<typeof exportSchema>;

export interface ImportResult {
  locations: number;
  items: number;
  skipped: number;
  covers: number;
}

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}
