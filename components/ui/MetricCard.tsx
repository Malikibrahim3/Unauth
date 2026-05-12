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
  /** Hero variant: large display value, --space-6 padding, optional inline microchart */
  size?: 'hero';
  /** Optional microchart rendered inline below the value (hero variant only) */
  microchart?: ReactNode;
  className?: string;
}

const TONE_COLOR: Record<DeltaProps['tone'], string> = {
  positive: 'text-[var(--risk-low-fg)]',
  negative: 'text-[var(--risk-critical-fg)]',
  neutral:  'text-[var(--text-tertiary)]',
};

const ARROW: Record<DeltaProps['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({ label, value, delta, hint, icon, density = 'default', size, microchart, className }: MetricCardProps) {
  const isHero = size === 'hero';
  const padding = isHero
    ? 'p-[var(--space-6)]'
    : density === 'compact'
    ? 'p-[var(--space-4)]'
    : 'p-[var(--space-5)]';

  return (
    <div
      className={cn(
        'group rounded-[var(--radius-3)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-shadow hover:shadow-[var(--shadow-1)]',
        padding,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-overline text-[var(--text-tertiary)] uppercase">{label}</span>
        {icon && <span className="text-[var(--text-tertiary)] w-4 h-4 shrink-0">{icon}</span>}
      </div>

      <div className={cn(
        'mt-[var(--space-1)] num text-[var(--text-primary)] leading-tight',
        isHero ? 'text-display-xl' : 'text-display',
      )}>
        {value}
      </div>

      {delta && (
        <div className={cn('mt-[var(--space-1)] text-small flex items-center gap-1', TONE_COLOR[delta.tone])}>
          <span aria-hidden="true">{ARROW[delta.direction]}</span>
          <span>{delta.value > 0 ? '+' : ''}{delta.value}</span>
        </div>
      )}

      {isHero && microchart && (
        <div className="mt-[var(--space-3)]" aria-hidden="true">
          {microchart}
        </div>
      )}

      {hint && (
        <p className="mt-[var(--space-1)] text-small text-[var(--text-tertiary)]">{hint}</p>
      )}
    </div>
  );
}
