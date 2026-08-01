'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/ui';
import {
  applyThemePreference,
  readStoredTheme,
  type ThemePreference,
} from '@/lib/theme/preference';

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<ThemePreference>('light');

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyThemePreference(stored);
  }, []);

  function selectTheme(next: ThemePreference) {
    setTheme(next);
    applyThemePreference(next);
  }

  return (
    <SectionCard joined title="Appearance" description="How the workspace looks on your screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
            Color theme
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            Switch between light and dark mode. Your choice is saved on this device.
          </p>
        </div>
        <fieldset
          className="inline-flex shrink-0 rounded-md border p-0.5 m-0 min-w-0"
          style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-muted)' }}
          aria-label="Color theme"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => selectTheme(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
                  active
                    ? 'text-[var(--ua-text-primary)]'
                    : 'text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-secondary)]',
                )}
                style={{
                  background: active ? 'var(--ua-surface-primary)' : 'transparent',
                }}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </fieldset>
      </div>
    </SectionCard>
  );
}
