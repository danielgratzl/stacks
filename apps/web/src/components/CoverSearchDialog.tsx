import { COVER_SOURCES_FOR, type CoverCandidate, type CoverSource, type MediaType } from '@stacks/shared';
import { useQueries } from '@tanstack/react-query';
import { Check, Loader2, Search, XIcon } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiRequestError } from '@/lib/api';
import { errorMessage } from '@/lib/queries';
import { cn } from '@/lib/utils';

const SOURCE: Record<CoverSource, string> = {
  openlibrary: 'Open Library',
  apple: 'Apple',
  deezer: 'Deezer',
};

/**
 * Searches cover services for the item and imports the chosen image. The dialog is portaled
 * out of the item form, but React still bubbles its events there, so keys and pastes stop here.
 */
export function CoverSearchDialog({
  open,
  onOpenChange,
  type,
  initialQuery,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: MediaType;
  initialQuery: string;
  onImport: (imageUrl: string) => Promise<void>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50" />
        <Dialog.Content
          onKeyDown={(e) => e.stopPropagation()}
          onPaste={(e) => e.stopPropagation()}
          className="bg-background data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 flex max-h-[min(720px,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border shadow-2xl duration-150"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b pl-5 pr-3">
            <Dialog.Title className="text-[15px] font-semibold">Find a cover</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search the web for a cover image and import it.
            </Dialog.Description>
            <Dialog.Close className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 grid size-9 place-items-center rounded-md outline-none transition-colors focus-visible:ring-[3px]">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <SearchBody
            type={type}
            initialQuery={initialQuery}
            onImport={onImport}
            onDone={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Lives inside the dialog content, so its state starts fresh each time the dialog opens. */
function SearchBody({
  type,
  initialQuery,
  onImport,
  onDone,
}: {
  type: MediaType;
  initialQuery: string;
  onImport: (imageUrl: string) => Promise<void>;
  onDone: () => void;
}) {
  const [input, setInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // One request per source: fast ones show right away, slower ones append as they answer.
  const sources = COVER_SOURCES_FOR[type];
  const searches = useQueries({
    queries: sources.map((source) => ({
      queryKey: ['cover-search', type, source, q],
      queryFn: () => api.covers.search({ type, source, q }),
      enabled: q.length > 0,
      staleTime: 10 * 60 * 1000,
      // Cover services sometimes drop a connection; one more try usually works.
      retry: (count: number, e: Error) => count < 1 && e instanceof ApiRequestError && e.status >= 500,
    })),
  });
  const results = searches.flatMap((s) => s.data ?? []).filter((r) => !broken.has(r.thumbnailUrl));
  const chosen = results.find((r) => r.imageUrl === selected);
  const pending = searches.filter((s) => s.isPending).length;
  const fetching = searches.some((s) => s.isFetching);
  const failed = sources.filter((_, i) => searches[i]!.isError);

  const submit = () => {
    const next = input.trim();
    if (!next) return;
    setSelected(null);
    setImportError(null);
    setQ(next);
    // Same words again: retry the sources that failed; the others are cached.
    if (next === q) for (const s of searches) if (s.isError) void s.refetch();
  };
  const use = async (candidate: CoverCandidate | undefined) => {
    if (!candidate || importing) return;
    setSelected(candidate.imageUrl);
    setImportError(null);
    setImporting(true);
    try {
      await onImport(candidate.imageUrl);
      onDone();
    } catch (e) {
      setImportError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const ratio = type === 'vinyl' ? '1 / 1' : '2 / 3';
  return (
    <>
      <div className="flex shrink-0 gap-2 px-5 pt-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={type === 'book' ? 'Title and author' : 'Album and artist'}
            aria-label="Search for a cover"
            className="pl-8"
          />
        </div>
        <Button variant="outline" disabled={!input.trim() || fetching} onClick={submit}>
          {fetching ? <Loader2 className="animate-spin" /> : 'Search'}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {!q ? (
          <Message>Search by title and {type === 'book' ? 'author' : 'artist'} to see covers.</Message>
        ) : failed.length === sources.length ? (
          <Message tone="error">{errorMessage(searches[0]!.error)}</Message>
        ) : !results.length && !pending ? (
          <Message>No covers found. Try fewer words, or check the spelling.</Message>
        ) : (
          <Grid>
            {results.map((r) => {
              const isSelected = r.imageUrl === selected;
              return (
                <button
                  key={r.imageUrl}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={importing}
                  onClick={() => setSelected(r.imageUrl)}
                  onDoubleClick={() => void use(r)}
                  className="group min-w-0 rounded-md text-left outline-none disabled:cursor-wait"
                >
                  <div
                    style={{ aspectRatio: ratio }}
                    className={cn(
                      'bg-muted ring-offset-background group-focus-visible:ring-ring/50 relative overflow-hidden rounded-md ring-offset-2 transition-shadow group-focus-visible:ring-[3px]',
                      isSelected
                        ? 'ring-foreground ring-2'
                        : 'group-hover:ring-foreground/30 group-hover:ring-2',
                    )}
                  >
                    <img
                      src={r.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setBroken((b) => new Set(b).add(r.thumbnailUrl))}
                      className="h-full w-full object-contain"
                    />
                    {isSelected && (
                      <span className="bg-foreground text-background anim-pop absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full shadow">
                        {importing ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 truncate text-xs font-medium" title={r.title}>
                    {r.title || 'Untitled'}
                  </div>
                  <div className="text-muted-foreground truncate text-[11px]">
                    {[r.creator, r.year, SOURCE[r.source]].filter(Boolean).join(' · ')}
                  </div>
                </button>
              );
            })}
            {Array.from({ length: pending * 4 }, (_, i) => (
              <div key={`pending-${i}`}>
                <Skeleton style={{ aspectRatio: ratio }} />
                <Skeleton className="mt-2 h-3 w-3/4" />
              </div>
            ))}
          </Grid>
        )}
        {failed.length > 0 && failed.length < sources.length && (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            {failed.map((f) => SOURCE[f]).join(' and ')} didn’t answer. Search again to retry.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3">
        {importError ? (
          <p role="alert" className="anim-shake text-destructive text-xs">
            {importError}
          </p>
        ) : (
          <p className="text-muted-foreground hidden text-xs sm:block">
            Pick one, or double-click to use it right away.
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Dialog.Close asChild>
            <Button variant="ghost">Cancel</Button>
          </Dialog.Close>
          <Button disabled={!chosen || importing} onClick={() => void use(chosen)}>
            {importing && <Loader2 className="animate-spin" />}
            {importing ? 'Importing…' : 'Use cover'}
          </Button>
        </div>
      </div>
    </>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">{children}</div>
);

const Message = ({ children, tone }: { children: React.ReactNode; tone?: 'error' }) => (
  <p
    role={tone === 'error' ? 'alert' : undefined}
    className={cn(
      'py-12 text-center text-sm',
      tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
    )}
  >
    {children}
  </p>
);
