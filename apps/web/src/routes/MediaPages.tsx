import { groupSeries } from '@stacks/shared';
import { BookOpen, Layers, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { plural } from '@/lib/format';
import { isWish } from '@/lib/media';
import { useItems } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { Browse } from './Browse';
import { SeriesList } from './SeriesList';

function useOwned() {
  const { data, isPending } = useItems();
  const owned = useMemo(() => (data ?? []).filter((i) => !isWish(i)), [data]);
  const wishlist = useMemo(() => (data ?? []).filter(isWish), [data]);
  return { owned, wishlist, isPending };
}

export function BooksPage() {
  const { owned, wishlist, isPending } = useOwned();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sheet = useSheet();
  const books = owned.filter((i) => i.type === 'book');
  const seriesCount = useMemo(() => groupSeries(books).length, [books]);
  const tab = pathname.endsWith('/series') && seriesCount ? 'series' : 'all';

  return (
    <div className="anim-fade">
      <PageHeader
        title="Books"
        subtitle={
          tab === 'series'
            ? `${plural(seriesCount, 'series', 'series')} across ${plural(books.length, 'book')}`
            : plural(books.length, 'book')
        }
        actions={
          <Button size="sm" className="md:hidden" onClick={() => sheet.add('book')}>
            <Plus />
            Add
          </Button>
        }
      />
      {seriesCount > 0 && (
        <Segmented
          className="mb-4"
          value={tab}
          onChange={(t) => navigate(t === 'series' ? '/books/series' : '/books')}
          options={[
            { value: 'all', label: 'All books', icon: BookOpen },
            { value: 'series', label: `Series ${seriesCount}`, icon: Layers },
          ]}
        />
      )}
      <div key={tab} className="anim-fade">
        {tab === 'series' ? (
          <SeriesList owned={books} wishlist={wishlist} focus={params.get('focus')} />
        ) : (
          <Browse type="book" items={owned} loading={isPending} />
        )}
      </div>
    </div>
  );
}

export function VinylPage() {
  const { owned, isPending } = useOwned();
  const sheet = useSheet();
  const count = owned.filter((i) => i.type === 'vinyl').length;
  return (
    <div className="anim-fade">
      <PageHeader
        title="Vinyl"
        subtitle={plural(count, 'record')}
        actions={
          <Button size="sm" className="md:hidden" onClick={() => sheet.add('vinyl')}>
            <Plus />
            Add
          </Button>
        }
      />
      <Browse type="vinyl" items={owned} loading={isPending} />
    </div>
  );
}
