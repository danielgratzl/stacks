import { validateItem, type Item, type ItemFields, type Location } from '@stacks/shared';
import { Barcode, BookOpen, Disc3, Heart, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { uniqueSorted } from '@/lib/format';
import { LANGUAGES, MEDIA } from '@/lib/media';
import { toFormValues, type FormErrors as Errors, type FormValues } from '@/lib/item-form';
import { cn } from '@/lib/utils';
import { ChipInput } from './ChipInput';
import { CoverPicker } from './CoverPicker';
import { LocationSelect } from './LocationSelect';

const YEAR = /^\d{4}$/;

function toFields(v: FormValues): { fields?: ItemFields; errors: Errors } {
  const errors: Errors = {};
  if (!v.title.trim()) errors.title = 'Add a title to save this item.';
  const oy = v.originalYear.trim();
  const ey = v.editionYear.trim();
  if (oy && !YEAR.test(oy)) errors.originalYear = 'Use four digits, like 1959.';
  if (ey && !YEAR.test(ey)) errors.editionYear = 'Use four digits, like 2015.';
  if (Object.keys(errors).length) return { errors };
  const fields: ItemFields = {
    ...v,
    title: v.title.trim(),
    originalYear: oy ? +oy : null,
    editionYear: ey ? +ey : null,
  };
  return { fields, errors: validateItem(fields) as Errors };
}

export function ItemForm({
  initial,
  mode,
  items,
  locations,
  onSubmit,
  onCancel,
  serverErrors,
  saving,
}: {
  initial: FormValues;
  mode: 'add' | 'edit';
  items: Item[];
  locations: Location[];
  onSubmit: (fields: ItemFields, addAnother: boolean) => Promise<boolean>;
  onCancel?: () => void;
  serverErrors?: Errors;
  saving?: boolean;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [shake, setShake] = useState(0);
  const [coverBusy, setCoverBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const full = mode === 'edit';
  const wish = values.status === 'wishlist';
  const media = MEDIA[values.type];

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) {
      setErrors(serverErrors);
      setShake((s) => s + 1);
    }
  }, [serverErrors]);
  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 320);
    return () => clearTimeout(t);
  }, []);

  const set = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const suggestions = useMemo(() => {
    const same = items.filter((i) => i.type === values.type);
    return {
      creators: uniqueSorted(same.flatMap((i) => i.creators)),
      publishers: uniqueSorted(same.map((i) => i.publisher)),
      series: uniqueSorted(same.map((i) => i.seriesName)),
      tags: uniqueSorted(same.flatMap((i) => i.tags)),
      languages: uniqueSorted([...items.map((i) => i.language), ...LANGUAGES]).filter(
        (l) => values.type === 'vinyl' || l !== 'Instrumental',
      ),
    };
  }, [items, values.type]);

  const submit = async (addAnother: boolean) => {
    const { fields, errors: found } = toFields(values);
    if (!fields || Object.keys(found).length) {
      setErrors(found);
      setShake((s) => s + 1);
      if (found.title) titleRef.current?.focus();
      return;
    }
    const ok = await onSubmit(fields, addAnother);
    if (ok && addAnother) {
      // Keep what's likely shared by the next item on the same shelf.
      setValues((v) => ({
        ...toFormValues({ type: v.type }),
        status: v.status,
        locationId: v.locationId,
        language: v.language,
        publisher: v.publisher,
      }));
      setTimeout(() => titleRef.current?.focus(), 30);
    }
  };

  const field = (
    key: keyof FormValues,
    label: string,
    control: React.ReactNode,
    optional = false,
    className = '',
  ) => (
    <div className={className}>
      <Label htmlFor={key} optional={optional}>
        {label}
      </Label>
      {control}
      {errors[key] && (
        <p key={shake} className="anim-shake text-destructive mt-1.5 text-xs">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const invalid = (key: keyof FormValues) => (errors[key] ? true : undefined);

  const moveNote = !full
    ? null
    : wish
      ? initial.status !== 'wishlist'
        ? `Moves out of your collection when you save.${initial.locationId || initial.loan ? ` Its location${initial.loan ? ' and loan' : ''} will be cleared.` : ''}`
        : 'Kept separate from your collection until you get it.'
      : initial.status === 'wishlist'
        ? 'Moves into your collection when you save.'
        : 'Turn on if you don’t own this yet.';

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          void submit(false);
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-6">
        {!full && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              className="w-full sm:w-auto"
              value={values.type}
              onChange={(t) => set('type', t)}
              options={[
                { value: 'book', label: 'Book', icon: BookOpen },
                { value: 'vinyl', label: 'Vinyl', icon: Disc3 },
              ]}
            />
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <Switch checked={wish} onCheckedChange={(c) => set('status', c ? 'wishlist' : 'owned')} />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 transition-colors',
                  wish ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Heart
                  className={cn(
                    'size-3.5 transition-transform duration-300',
                    wish && 'fill-vinyl text-vinyl scale-110',
                  )}
                />
                Add to wishlist
              </span>
            </label>
          </div>
        )}
        {full && (
          <div
            className={cn(
              'mb-6 rounded-lg border p-3 pl-4 transition-colors duration-200',
              wish && 'border-vinyl/40 bg-vinyl/5',
            )}
          >
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <Switch checked={wish} onCheckedChange={(c) => set('status', c ? 'wishlist' : 'owned')} />
              <Heart className={cn('size-3.5', wish && 'fill-vinyl text-vinyl')} />
              On wishlist
            </label>
            <p className="text-muted-foreground mt-1.5 pl-[46px] text-xs">{moveNote}</p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-[150px_1fr]">
          <CoverPicker
            type={values.type}
            title={values.title || 'Untitled'}
            value={values.cover}
            onChange={(c) => set('cover', c)}
            onBusyChange={setCoverBusy}
          />
          <div className="grid content-start gap-4">
            {field(
              'title',
              'Title',
              <Input
                id="title"
                ref={titleRef}
                value={values.title}
                aria-invalid={invalid('title')}
                onChange={(e) => set('title', e.target.value)}
                placeholder={values.type === 'book' ? 'The Left Hand of Darkness' : 'Blue Train'}
                autoComplete="off"
              />,
            )}
            {full &&
              field(
                'subtitle',
                'Subtitle',
                <Input
                  id="subtitle"
                  value={values.subtitle}
                  onChange={(e) => set('subtitle', e.target.value)}
                  autoComplete="off"
                />,
                true,
              )}
            {field(
              'creators',
              media.creators,
              <ChipInput
                id="creators"
                value={values.creators}
                onChange={(v) => set('creators', v)}
                suggestions={suggestions.creators}
                placeholder="Type a name, press Enter"
              />,
              true,
            )}
            {field(
              'publisher',
              media.publisher,
              <Input
                id="publisher"
                list="dl-publishers"
                value={values.publisher}
                onChange={(e) => set('publisher', e.target.value)}
                autoComplete="off"
              />,
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                'originalYear',
                'Original year',
                <Input
                  id="originalYear"
                  inputMode="numeric"
                  maxLength={4}
                  className="tnum"
                  aria-invalid={invalid('originalYear')}
                  value={values.originalYear}
                  onChange={(e) => set('originalYear', e.target.value)}
                  placeholder={values.type === 'book' ? '1965' : '1959'}
                  autoComplete="off"
                />,
              )}
              {field(
                'editionYear',
                'Edition year',
                <div className="relative">
                  <Input
                    id="editionYear"
                    inputMode="numeric"
                    maxLength={4}
                    className="tnum"
                    aria-invalid={invalid('editionYear')}
                    value={values.editionYear}
                    onChange={(e) => set('editionYear', e.target.value)}
                    placeholder={values.type === 'book' ? '2005' : '2015'}
                    autoComplete="off"
                  />
                  {YEAR.test(values.originalYear) && !values.editionYear && (
                    <button
                      type="button"
                      onClick={() => set('editionYear', values.originalYear)}
                      className="anim-pop text-muted-foreground hover:bg-accent hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      Same as original
                    </button>
                  )}
                </div>,
              )}
            </div>
            {values.type === 'book' && (
              <div className="grid grid-cols-[1fr_90px] gap-3">
                {field(
                  'seriesName',
                  'Series',
                  <Input
                    id="seriesName"
                    list="dl-series"
                    value={values.seriesName}
                    onChange={(e) => set('seriesName', e.target.value)}
                    placeholder="Name"
                    autoComplete="off"
                  />,
                  true,
                )}
                {field(
                  'seriesNumber',
                  'No.',
                  <Input
                    id="seriesNumber"
                    inputMode="decimal"
                    className="tnum"
                    value={values.seriesNumber}
                    onChange={(e) => set('seriesNumber', e.target.value)}
                    placeholder="1"
                    disabled={!values.seriesName.trim()}
                    autoComplete="off"
                  />,
                )}
              </div>
            )}
            <div className={cn('grid gap-3', wish ? 'grid-cols-1' : 'grid-cols-2')}>
              {!wish &&
                field(
                  'locationId',
                  'Location',
                  <LocationSelect
                    id="locationId"
                    value={values.locationId}
                    onChange={(id) => set('locationId', id)}
                    locations={locations}
                  />,
                )}
              {field(
                'language',
                'Language',
                <Input
                  id="language"
                  list="dl-languages"
                  value={values.language}
                  onChange={(e) => set('language', e.target.value)}
                  autoComplete="off"
                />,
              )}
            </div>
            {!wish && locations.length === 0 && (
              <p className="text-muted-foreground -mt-2 text-xs">
                Set up locations in Settings to say where things live.
              </p>
            )}
            {field(
              'barcode',
              values.type === 'book' ? 'ISBN or barcode' : 'Barcode',
              <div className="relative">
                <Barcode className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="barcode"
                  inputMode="numeric"
                  className="tnum pl-9"
                  value={values.barcode}
                  onChange={(e) => set('barcode', e.target.value)}
                  autoComplete="off"
                />
              </div>,
              true,
            )}
            {full &&
              field(
                'tags',
                'Tags',
                <ChipInput
                  id="tags"
                  variant="tag"
                  value={values.tags}
                  onChange={(v) => set('tags', v)}
                  suggestions={suggestions.tags}
                  placeholder="Add a tag, press Enter"
                />,
                true,
              )}
            {full &&
              field(
                'notes',
                'Notes',
                <Textarea
                  id="notes"
                  rows={4}
                  value={values.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />,
                true,
              )}
          </div>
        </div>
        <datalist id="dl-publishers">
          {suggestions.publishers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="dl-series">
          {suggestions.series.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="dl-languages">
          {suggestions.languages.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <div className="flex items-center gap-2 border-t px-5 py-3 sm:px-6">
        <span className="text-muted-foreground hidden text-xs lg:inline">⌘ Enter to save</span>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {!full && (
            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              disabled={saving || coverBusy}
              onClick={() => void submit(true)}
            >
              Save and add another
            </Button>
          )}
          <Button type="submit" disabled={saving || coverBusy}>
            {saving && <Loader2 className="animate-spin" />}
            {full ? 'Save changes' : wish ? 'Add to wishlist' : 'Add to library'}
          </Button>
        </div>
      </div>
    </form>
  );
}
