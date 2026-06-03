'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DEV_TIER_COOKIE, type DevPreviewCookieValue } from '@/lib/product/devPreview';
import { useDevPreview } from '@/components/product/DevPreviewContext';

const OPTIONS: { value: DevPreviewCookieValue; label: string; description: string }[] = [
  { value: 'dev', label: 'Dev mode', description: 'Everything open' },
  { value: 'free', label: 'Free', description: 'Own-store + metered checks' },
  { value: 'pro', label: 'Pro', description: 'Unlimited decisions' },
  { value: 'growth', label: 'Growth', description: 'Network + APIs' },
  { value: 'scale', label: 'Scale', description: 'Large ops' },
  { value: 'enterprise', label: 'Enterprise', description: 'Signal API' },
];

function writeTierCookie(value: DevPreviewCookieValue) {
  document.cookie = `${DEV_TIER_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function tierDotClass(value: DevPreviewCookieValue): string {
  if (value === 'dev') return 'bg-[var(--ink-tertiary)]';
  if (value === 'free') return 'bg-emerald-500';
  if (value === 'pro') return 'bg-blue-500';
  if (value === 'growth' || value === 'advanced') return 'bg-purple-500';
  if (value === 'scale') return 'bg-violet-400';
  if (value === 'enterprise') return 'bg-amber-500';
  return 'bg-[var(--ink-tertiary)]';
}

export function DevTierSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const preview = useDevPreview();

  const activeCookieValue: DevPreviewCookieValue =
    preview && preview.enforce ? preview.tier : 'dev';
  const activeOption = OPTIONS.find((o) => o.value === activeCookieValue) ?? OPTIONS[0];

  function handleChange(value: DevPreviewCookieValue) {
    writeTierCookie(value);
    router.refresh();
  }

  if (collapsed) {
    return (
      <div
        className="flex justify-center py-1"
        title={`Dev preview: ${activeOption.label}`}
      >
        <span
          className={cn('h-2 w-2 rounded-full', tierDotClass(activeCookieValue))}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="px-2 pb-1">
      <div
        className="rounded-md border px-2 py-1.5"
        style={{
          borderColor: 'var(--surface-border)',
          background: 'var(--surface-overlay)',
        }}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-tertiary)]">
          Dev preview
        </p>
        <div className="flex flex-col gap-0.5">
          {OPTIONS.map((opt) => {
            const isActive = opt.value === activeCookieValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange(opt.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-xs transition-colors',
                  isActive
                    ? 'font-semibold text-[var(--ink-primary)]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
                )}
                style={
                  isActive
                    ? { background: 'color-mix(in srgb, var(--copper-bright) 12%, transparent)' }
                    : undefined
                }
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', tierDotClass(opt.value))}
                    aria-hidden="true"
                  />
                  {opt.label}
                </span>
                <span className="text-[var(--ink-tertiary)]">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
