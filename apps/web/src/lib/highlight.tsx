import { createContext, useCallback, useContext, useRef, useState } from 'react';

const HighlightContext = createContext<{ id: string | null; flash: (id: string) => void }>({
  id: null,
  flash: () => {},
});

/** Briefly highlights an item that was just added or moved, wherever it is shown. */
export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = useCallback((next: string) => {
    clearTimeout(timer.current);
    setId(next);
    timer.current = setTimeout(() => setId(null), 2600);
  }, []);
  return <HighlightContext.Provider value={{ id, flash }}>{children}</HighlightContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useHighlight = () => useContext(HighlightContext);
