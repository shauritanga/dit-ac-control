import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  /** @deprecated use setMode */
  setTheme: (theme: ResolvedTheme) => void;
};

const STORAGE_KEY = 'dit-ac-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  // Migrate legacy boolean-ish values
  if (stored === 'dark' || stored === 'light') return stored;
  return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [theme, setResolved] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return resolveMode(getInitialMode());
  });

  useEffect(() => {
    const apply = () => {
      const resolved = resolveMode(mode);
      setResolved(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      localStorage.setItem(STORAGE_KEY, mode);
    };

    apply();

    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const setTheme = useCallback((next: ResolvedTheme) => {
    setModeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((current) => {
      const resolved = current === 'system' ? resolveMode('system') : current;
      return resolved === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value = useMemo(
    () => ({ mode, theme, setMode, toggleTheme, setTheme }),
    [mode, theme, setMode, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
