import { ITEM_DEFAULTS, type ItemFields, type MediaType } from '@stacks/shared';

/** Form state keeps years as text so partial input is possible. */
export type FormValues = Omit<ItemFields, 'originalYear' | 'editionYear'> & {
  originalYear: string;
  editionYear: string;
};
export type FormErrors = Partial<Record<keyof FormValues, string>>;

export const toFormValues = (fields: Partial<ItemFields> & { type: MediaType }): FormValues => {
  const merged = { ...ITEM_DEFAULTS, title: '', ...fields } as ItemFields;
  return {
    ...merged,
    originalYear: merged.originalYear?.toString() ?? '',
    editionYear: merged.editionYear?.toString() ?? '',
  };
};
