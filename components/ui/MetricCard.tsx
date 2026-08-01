'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useChangedValueHighlight } from '@/lib/design/useChangedValueHighlight';

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
  neutral: 'var(--ua-text-secondary)',
};

const ARROW_ICON: Record<DeltaProps['direction'], typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

export function MetricCard({ label, value, delta, hint, icon, density = 'default', size, microchart, className }: MetricCardProps) {
  const isHero = size === 'hero';
  const displayValue = value;
  const highlighting = useChangedValueHighlight(value);

  return (
    <div
      className={cn(
        'ua-metric-card ua-card ua-card--panel',
        isHero ? 'ua-metric-card--hero' : density === 'compact' ? 'ua-card--density-compact' : 'ua-card--density-default',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="ua-metric-card__label">
          {label}
        </span>
        {icon ? <span aria-hidden="true" className="sr-only">{icon}</span> : null}
      </div>

      <div className={cn('ua-metric-card__value mt-3 num leading-tight tabular-nums', highlighting && 'ua-value-wash')}>
        {displayValue}
      </div>

      {delta && (() => {
        const DeltaIcon = ARROW_ICON[delta.direction];
        return (
          <div
            className="mt-1 flex items-center gap-1"
            style={{ color: TONE_COLOR[delta.tone] }}
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
        <p className="ua-metric-card__hint mt-1">{hint}</p>
      )}
    </div>
  );
}
