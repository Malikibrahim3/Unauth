'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'unauth.theme';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let next: Theme = 'light';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') next = stored;
    } catch {
      next = 'light';
    }
    setTheme(next);
    applyTheme(next);
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
      }}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
        'border-[var(--surface-border)] text-[var(--ink-tertiary)]',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:border-[var(--copper-bright)] hover:text-[var(--ink-primary)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2',
        className,
      )}
      style={{ background: 'var(--surface-input)' }}
    >
      {isDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
    </button>
  );
}
