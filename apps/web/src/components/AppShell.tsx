import {
  ArrowUpRight,
  BookOpen,
  Disc3,
  Ellipsis,
  Heart,
  Home,
  Plus,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isWish } from '@/lib/media';
import { useItems } from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { cn } from '@/lib/utils';
import { ItemSheet } from './ItemSheet';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  gapBefore?: boolean;
  mobile?: boolean;
  tone?: string;
}

function Logo() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
      <rect x="3" y="5" width="5" height="18" rx="1" className="fill-book" />
      <rect x="9.5" y="8" width="4" height="15" rx="1" fill="currentColor" opacity=".8" />
      <circle cx="19.5" cy="15.5" r="6.5" className="fill-vinyl" />
      <circle cx="19.5" cy="15.5" r="1.6" className="fill-background" />
      <rect x="2" y="23.5" width="24" height="2" rx="1" fill="currentColor" opacity=".35" />
    </svg>
  );
}

/** Keyboard shortcuts: N adds an item, / focuses the page's search field. */
function useShortcuts(addDefault: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'n') {
        e.preventDefault();
        addDefault();
      } else if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-search]');
        if (search) {
          e.preventDefault();
          search.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addDefault]);
}

export function AppShell() {
  const { data: items = [] } = useItems();
  const sheet = useSheet();
  const { pathname } = useLocation();

  const counts = useMemo(() => {
    const owned = items.filter((i) => !isWish(i));
    return {
      book: owned.filter((i) => i.type === 'book').length,
      vinyl: owned.filter((i) => i.type === 'vinyl').length,
      wish: items.length - owned.length,
      lent: owned.filter((i) => i.loan).length,
    };
  }, [items]);

  const nav: NavEntry[] = [
    { to: '/', label: 'Overview', icon: Home, mobile: true },
    { to: '/books', label: 'Books', icon: BookOpen, count: counts.book, mobile: true, tone: 'text-book' },
    { to: '/vinyl', label: 'Vinyl', icon: Disc3, count: counts.vinyl, mobile: true, tone: 'text-vinyl' },
    { to: '/wishlist', label: 'Wishlist', icon: Heart, count: counts.wish, gapBefore: true, mobile: true },
    { to: '/lent', label: 'Lent out', icon: ArrowUpRight, count: counts.lent },
    { to: '/settings', label: 'Settings', icon: SlidersHorizontal, gapBefore: true },
  ];

  const addDefault = () =>
    sheet.add(pathname.startsWith('/vinyl') ? 'vinyl' : 'book', {
      wishlist: pathname.startsWith('/wishlist'),
    });
  useShortcuts(addDefault);
  const inMore = nav.some((n) => !n.mobile && pathname.startsWith(n.to));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r px-3 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2.5 pb-6">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">Stacks</span>
        </div>
        <Button className="mb-5 w-full justify-start" onClick={addDefault}>
          <Plus />
          Add item
          <span className="border-primary-foreground/25 ml-auto rounded border px-1.5 text-[11px] font-normal opacity-70">
            N
          </span>
        </Button>
        <nav className="space-y-0.5" aria-label="Main">
          {nav.map((n) => (
            <div key={n.to}>
              {n.gapBefore && <div className="bg-border mx-2.5 my-2 h-px" />}
              <NavLink
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'focus-visible:ring-ring/50 group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:ring-[3px]',
                    isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon className={cn('size-4', isActive && n.tone)} />
                    {n.label}
                    {!!n.count && (
                      <span key={n.count} className="anim-pop text-muted-foreground tnum ml-auto text-xs">
                        {n.count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <main className="px-5 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-5 sm:px-8 md:pb-16 md:pt-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
      >
        {nav
          .filter((n) => n.mobile)
          .map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-12 place-items-center rounded-full transition-colors duration-200',
                      isActive && 'bg-accent',
                    )}
                  >
                    <n.icon className="size-[18px]" />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex h-14 flex-col items-center justify-center gap-1 text-[11px] outline-none',
              inMore ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className={cn('grid h-7 w-12 place-items-center rounded-full', inMore && 'bg-accent')}>
              <Ellipsis className="size-[18px]" />
            </span>
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {nav
              .filter((n) => !n.mobile)
              .map((n) => (
                <DropdownMenuItem key={n.to} asChild>
                  <NavLink to={n.to}>
                    <n.icon />
                    {n.label}
                    {!!n.count && (
                      <span className="text-muted-foreground tnum ml-auto text-xs">{n.count}</span>
                    )}
                  </NavLink>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <ItemSheet />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground tnum mt-0.5 text-sm">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
