import { useEffect, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'stacks-theme';
const listeners = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply() {
  const pref = read();
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  listeners.forEach((l) => l());
}

media.addEventListener('change', apply);

export function setTheme(pref: ThemePreference) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // storage unavailable: still apply for this session
  }
  apply();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, read);
  const resolved = useSyncExternalStore(subscribe, () =>
    document.documentElement.classList.contains('dark') ? ('dark' as const) : ('light' as const),
  );
  useEffect(apply, []);
  return { preference, resolved, setTheme };
}
