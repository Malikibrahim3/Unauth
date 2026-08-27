'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthenticatedTheme } from '@/components/theme/AuthenticatedThemeProvider';
import { SectionCard } from '@/components/ui';
import type { AuthenticatedTheme } from '@/lib/theme/authenticatedTheme';

const OPTIONS: Array<{ value: AuthenticatedTheme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useAuthenticatedTheme();

  return (
    <SectionCard joined title="Appearance" description="Choose the colour theme for your authenticated workspace.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>
            Workspace theme
          </p>
          <p className="ua-text-caption-role mt-0.5" style={{ color: 'var(--uo-route-text-secondary)' }}>
            Light is the default. Dark applies only to signed-in product pages and is saved on this device.
          </p>
        </div>
        <fieldset
          className="inline-flex shrink-0 rounded-md border p-0.5 m-0 min-w-0"
          style={{ borderColor: 'var(--uo-route-border-default)', background: 'var(--uo-route-surface-muted)' }}
          aria-label="Workspace theme"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                data-theme-option={value}
                data-selected={active ? 'true' : undefined}
                onClick={() => setTheme(value)}
                className={cn(
                  'ua-text-label inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--uo-route-border-focus)] focus-visible:outline-offset-2',
                  active
                    ? 'text-[var(--uo-route-text-primary)]'
                    : 'text-[var(--uo-route-text-tertiary)] hover:text-[var(--uo-route-text-secondary)]',
                )}
                style={{ background: active ? 'var(--uo-route-surface-primary)' : 'transparent' }}
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
