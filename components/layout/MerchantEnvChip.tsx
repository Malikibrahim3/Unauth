'use client';

import { cn } from '@/lib/utils';

interface MerchantEnvChipProps {
  merchantName: string | null;
  /** Demo/sample tenant — shown as a "Demo" pill. */
  isDemo?: boolean;
  className?: string;
}

/**
 * MerchantEnvChip — small badge shown left-of-search in AppHeader.
 * Displays the merchant name alongside an honest status pill:
 * - Demo/sample tenants show a "Demo" pill.
 * - Everything else shows no pill.
 */
export function MerchantEnvChip({ merchantName, isDemo, className }: MerchantEnvChipProps) {
  if (!merchantName) return null;

  // Sentence case (§3.2) — the chip used to rely on a CSS text-transform.
  const pill = isDemo ? 'Demo' : null;

  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md flex-shrink-0',
        'border border-[var(--ua-border-default)] bg-[var(--ua-surface-secondary)]',
        'select-none',
        className,
      )}
      title={pill ? `${merchantName} · ${pill}` : merchantName}
    >
      {/* Merchant name */}
      <span className="text-caption font-medium text-[var(--ua-text-primary)] max-w-[120px] truncate">
        {merchantName}
      </span>

      {/* Status pill — only rendered for demo/non-production */}
      {pill ? (
        <span
          className={cn(
            'inline-flex items-center rounded px-1 py-px',
            'text-[length:var(--ua-text-micro-size)] font-semibold leading-none',
            'bg-[var(--ua-info-bg)] border border-[var(--ua-info-border)] text-[var(--ua-info)]',
          )}
        >
          {pill}
        </span>
      ) : null}
    </div>
  );
}
