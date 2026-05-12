'use client';

import { cn } from '@/lib/utils';

interface MerchantEnvChipProps {
  merchantName: string | null;
  /** e.g. 'production' | 'sandbox' | 'staging'. Defaults to 'production'. */
  environment?: string;
  className?: string;
}

/**
 * MerchantEnvChip — small badge shown left-of-search in AppHeader.
 * Displays the merchant name alongside an environment pill.
 * Per §5.3 of the Amplitude Core Design Amplification Plan.
 */
export function MerchantEnvChip({ merchantName, environment = 'production', className }: MerchantEnvChipProps) {
  if (!merchantName) return null;

  const isProd = environment === 'production';

  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md flex-shrink-0',
        'border border-[var(--border)] bg-[var(--bg-inset)]',
        'select-none',
        className,
      )}
      title={`${merchantName} · ${environment}`}
    >
      {/* Merchant name */}
      <span className="text-caption font-medium text-[var(--text)] max-w-[120px] truncate">
        {merchantName}
      </span>

      {/* Environment pill */}
      <span
        className={cn(
          'inline-flex items-center rounded px-1 py-px',
          'text-[10px] font-semibold uppercase leading-none tracking-wide',
          isProd
            ? 'bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
        )}
      >
        {isProd ? 'prod' : environment.slice(0, 4)}
      </span>
    </div>
  );
}
