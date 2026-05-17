'use client';

/**
 * Phase E-4 — ROI / SavingsCard
 *
 * Feature-flagged by FLAG_SAVINGS_CARD (default-off).
 *
 * Displays the conservative estimate of fraud value intercepted over the last
 * 30 days.  Methodology is displayed inline for transparency.
 *
 * Methodology (conservative):
 *   Sum of order_value for transactions where:
 *     - match_status IN ('confirmed_fraud', 'confirmed-fraud') OR
 *     - merchant_feedback = 'fraud'
 *     - processed_at >= now() - interval '30 days'
 *     - merchant-scoped
 *
 * READ-ONLY. No writes. Merchant-scoped.
 */

import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';

export interface SavingsCardData {
  confirmedFraudValue: number;   // sum over last 30d
  confirmedFraudCount: number;
  currency: string;
  periodDays: number;
  lastUpdated: string; // ISO
}

interface SavingsCardProps {
  data: SavingsCardData | null;
  loading?: boolean;
  className?: string;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SavingsCard({ data, loading, className }: SavingsCardProps) {
  const animatedValue = useCountUp(data?.confirmedFraudValue ?? 0, {
    format: (value) => formatCurrency(value, data?.currency ?? 'GBP'),
  });

  return (
    <div
      className={cn(
        'rounded-[var(--radius-3)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]',
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-[var(--text-tertiary)]"
        >
          <path
            d="M8 2L3 4.5V8c0 3.333 2 5.167 5 6 3-0.833 5-2.667 5-6V4.5L8 2z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Hero value */}
      {loading ? (
        <div className="h-9 rounded animate-pulse" style={{ background: 'var(--bg-surface-sunk)', width: '60%' }} />
      ) : data ? (
        <p className="text-display-xl num leading-none text-[var(--text-primary)]">
          {animatedValue}
        </p>
      ) : (
        <p className="text-display num leading-none text-[var(--text-tertiary)]">—</p>
      )}

      {/* Sub-label */}
      {!loading && data && (
        <p className="text-small text-[var(--text-secondary)]">
          {data.confirmedFraudCount.toLocaleString()} confirmed-fraud order
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
          transactions with <code className="text-mono-sm">match_status = confirmed_fraud</code> or{' '}
          <code className="text-mono-sm">merchant_feedback = fraud</code> over the last{' '}
          {data?.periodDays ?? 30} days. Only your merchant data is included.
          Potential future fraud prevented is not counted.
        </p>
      </details>
    </div>
  );
}
