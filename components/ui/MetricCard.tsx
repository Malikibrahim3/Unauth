'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { formatNumber } from '@/lib/utils/format';

interface DeltaProps {
  value: number;
  direction: 'up' | 'down' | 'flat';
  tone: 'positive' | 'negative' | 'neutral';
}

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: DeltaProps;
  hint?: string;
  icon?: ReactNode;
  density?: 'default' | 'compact';
  size?: 'hero';
  microchart?: ReactNode;
  className?: string;
}

const TONE_COLOR: Record<DeltaProps['tone'], string> = {
  positive: 'var(--risk-low-fg)',
  negative: 'var(--risk-critical-fg)',
  neutral:  'var(--text-secondary)',
};

const ARROW_ICON: Record<DeltaProps['direction'], typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

export function MetricCard({ label, value, delta, hint, icon, density = 'default', size, microchart, className }: MetricCardProps) {
  const isHero = size === 'hero';
  const padding = isHero ? 'var(--space-5)' : density === 'compact' ? 'var(--space-3)' : 'var(--space-4)';
  const numericValue = typeof value === 'number' ? value : null;
  const animatedValue = useCountUp(numericValue ?? 0, {
    format: (next) => formatNumber(Math.round(next)),
  });
  const displayValue = numericValue !== null ? animatedValue : value;

  return (
    <div
      className={cn('ua-metric-card group', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          lineHeight: 1,
        }}
      >
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--brand-deep)', flexShrink: 0 }} className="ua-identity-tile flex h-8 w-8 items-center justify-center">
            {icon}
          </span>
        )}
      </div>

      <div
        className="mt-3 num leading-tight tabular-nums"
        style={{
          fontSize: isHero ? 40 : 30,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.04em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {displayValue}
      </div>

      {delta && (() => {
        const DeltaIcon = ARROW_ICON[delta.direction];
        return (
          <div
            className="mt-1 flex items-center gap-1"
            style={{ fontSize: 12, color: TONE_COLOR[delta.tone] }}
          >
            <DeltaIcon size={12} aria-hidden="true" />
            <span>{delta.value > 0 ? '+' : ''}{delta.value}</span>
          </div>
        );
      })()}

      {isHero && microchart && (
        <div className="mt-3" aria-hidden="true">
          {microchart}
        </div>
      )}

      {hint && (
        <p className="mt-1" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{hint}</p>
      )}
    </div>
  );
}
