'use client';

import { cn } from '@/lib/utils';

interface MerchantEnvChipProps {
  merchantName: string | null;
  /** Real deployment environment, e.g. 'production' | 'preview' | 'development'. */
  environment?: string;
  /** Demo/sample tenant — shown as a "Demo" pill (takes precedence over environment). */
  isDemo?: boolean;
  className?: string;
}

/**
 * MerchantEnvChip — small badge shown left-of-search in AppHeader.
 * Displays the merchant name alongside an honest status pill:
 * - Demo/sample tenants show a "Demo" pill.
 * - Non-production deploys (preview/development) show the environment.
 * - Production shows no pill — production is the default and a "prod" badge on
 *   every page is noise (and was actively misleading on demo tenants).
 */
export function MerchantEnvChip({ merchantName, environment, isDemo, className }: MerchantEnvChipProps) {
  if (!merchantName) return null;

  const pill = isDemo
    ? 'demo'
    : environment && environment !== 'production'
      ? environment.slice(0, 4)
      : null;

  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md flex-shrink-0',
        'border border-[var(--border)] bg-[var(--bg-inset)]',
        'select-none',
        className,
      )}
      title={pill ? `${merchantName} · ${pill}` : merchantName}
    >
      {/* Merchant name */}
      <span className="text-caption font-medium text-[var(--text)] max-w-[120px] truncate">
        {merchantName}
      </span>

      {/* Status pill — only rendered for demo/non-production */}
      {pill ? (
        <span
          className={cn(
            'inline-flex items-center rounded px-1 py-px',
            'text-xs font-semibold uppercase leading-none tracking-wide',
            'bg-[var(--info-bg)] border border-[var(--info-bd)] text-[var(--info)]',
          )}
        >
          {pill}
        </span>
      ) : null}
    </div>
  );
}
