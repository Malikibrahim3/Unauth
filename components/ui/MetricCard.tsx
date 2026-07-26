'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  positive: 'var(--ua-risk-low)',
  negative: 'var(--ua-risk-critical)',
  neutral:  'var(--ua-text-secondary)',
};

const ARROW_ICON: Record<DeltaProps['direction'], typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

export function MetricCard({ label, value, delta, hint, icon, density = 'default', size, microchart, className }: MetricCardProps) {
  const isHero = size === 'hero';
  const padding = isHero ? 'var(--ua-space-5)' : density === 'compact' ? 'var(--ua-space-3)' : 'var(--ua-space-4)';
  const displayValue = value;

  return (
    <div
      className={cn('ua-metric-card group', className)}
      style={{
        background: 'var(--ua-surface-primary)',
        border: '1px solid var(--ua-border-default)',
        borderRadius: 'var(--ua-radius-surface)',
        padding,
        boxShadow: 'none',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ua-text-tertiary)',
          lineHeight: 1,
        }}
      >
          {label}
        </span>
        {icon ? <span aria-hidden="true" className="sr-only">{icon}</span> : null}
      </div>

      <div
        className="mt-3 num leading-tight tabular-nums"
        style={{
          fontSize: isHero ? 24 : 23,
          fontWeight: 600,
          color: 'var(--ua-text-primary)',
          letterSpacing: '-0.01em',
          fontFamily: 'var(--ua-font-sans)',
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
        <p className="mt-1" style={{ fontSize: 12, color: 'var(--ua-text-tertiary)' }}>{hint}</p>
      )}
    </div>
  );
}
