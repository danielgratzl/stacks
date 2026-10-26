import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';
import { HighlightProvider } from '@/lib/highlight';
import { Lent } from '@/routes/Lent';
import { BooksPage, VinylPage } from '@/routes/MediaPages';
import { NotFound } from '@/routes/NotFound';
import { Overview } from '@/routes/Overview';
import { Settings } from '@/routes/Settings';
import { Wishlist } from '@/routes/Wishlist';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HighlightProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="books" element={<BooksPage />} />
              <Route path="books/series" element={<BooksPage />} />
              <Route path="vinyl" element={<VinylPage />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="lent" element={<Lent />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </HighlightProvider>
    </QueryClientProvider>
  );
}
