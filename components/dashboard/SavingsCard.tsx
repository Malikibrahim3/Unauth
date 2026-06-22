'use client';

/**
 * Phase E-4 — ROI / SavingsCard
 *
 * Feature-flagged by FLAG_SAVINGS_CARD (default-off).
 *
 * Displays the conservative estimate of post-purchase loss value intercepted over the last
 * 30 days.  Methodology is displayed inline for transparency.
 *
 * Methodology (conservative):
 *   Sum of order_value for transactions where:
 *     - legacy confirmed-loss markers OR
 *     - merchant feedback recorded as a confirmed loss
 *     - processed_at >= now() - interval '30 days'
 *     - merchant-scoped
 *
 * READ-ONLY. No writes. Merchant-scoped.
 */

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';

export interface SavingsCardData {
  confirmedFraudValue: number;   // legacy field name; sum over last 30d
  confirmedFraudCount: number;   // legacy field name
  currency: string;
  periodDays: number;
  lastUpdated: string; // ISO
}

interface SavingsCardProps {
  data: SavingsCardData | null;
  loading?: boolean;
  className?: string;
}

const savingsCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return savingsCurrencyFormatter.format(value);
}

export function SavingsCard({ data, loading, className }: SavingsCardProps) {
  const animatedValue = useCountUp(data?.confirmedFraudValue ?? 0, {
    format: (value) => formatCurrency(value),
  });

  return (
    <div
      className={cn(
        'rounded-[var(--radius-3)] border border-[var(--border-muted)] bg-[var(--surface)]',
        'p-[var(--space-5)] flex flex-col gap-[var(--space-3)]',
        'transition-shadow hover:shadow-[var(--shadow-1)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <span className="text-overline text-[var(--text-tertiary)] uppercase">
          Confirmed savings · last 30 days
        </span>
        {/* Visual shield icon */}
        <Shield
          size={16}
          aria-hidden="true"
          className="shrink-0 text-[var(--text-tertiary)]"
        />
      </div>

      {/* Hero value */}
      {loading ? (
        <div className="h-9 rounded animate-pulse" style={{ background: 'var(--surface-sunken)', width: '60%' }} />
      ) : data ? (
        <p className="text-display-xl num leading-none text-[var(--text-primary)]">
          {animatedValue}
        </p>
      ) : (
        <p className="text-display num leading-none text-[var(--text-tertiary)]">-</p>
      )}

      {/* Sub-label */}
      {!loading && data && (
        <p className="text-small text-[var(--text-secondary)]">
          {data.confirmedFraudCount.toLocaleString()} confirmed loss case
          {data.confirmedFraudCount !== 1 ? 's' : ''} intercepted
        </p>
      )}

      {/* Methodology disclosure */}
      <details className="mt-[var(--space-1)]">
        <summary
          className="text-meta text-[var(--text-tertiary)] cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors"
          style={{ listStyle: 'none' }}
        >
          Methodology ↓
        </summary>
        <p className="mt-[var(--space-2)] text-meta text-[var(--text-tertiary)] leading-relaxed">
          Conservative: sum of <code className="text-mono-sm">order_value</code> for
          transactions with legacy confirmed-loss markers or merchant feedback recorded as
          confirmed loss over the last{' '}
          {data?.periodDays ?? 30} days. Only your merchant data is included.
          Potential future loss prevented is not counted.
        </p>
      </details>
    </div>
  );
}
