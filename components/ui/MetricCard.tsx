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
  positive: '#2A6634',
  negative: '#7B2D26',
  neutral:  'var(--text-muted)',
};

const ARROW: Record<DeltaProps['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({ label, value, delta, hint, icon, density = 'default', size, microchart, className }: MetricCardProps) {
  const isHero = size === 'hero';
  const padding = isHero ? 20 : density === 'compact' ? 12 : 16;

  return (
    <div
      className={cn('group', className)}
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        padding,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: 'var(--icon-muted)', flexShrink: 0 }} className="w-4 h-4">
            {icon}
          </span>
        )}
      </div>

      <div
        className="mt-2 num leading-tight tabular-nums"
        style={{
          fontSize: isHero ? 28 : 20,
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>

      {delta && (
        <div
          className="mt-1 flex items-center gap-1"
          style={{ fontSize: 11, color: TONE_COLOR[delta.tone] }}
        >
          <span aria-hidden="true">{ARROW[delta.direction]}</span>
          <span>{delta.value > 0 ? '+' : ''}{delta.value}</span>
        </div>
      )}

      {isHero && microchart && (
        <div className="mt-3" aria-hidden="true">
          {microchart}
        </div>
      )}

      {hint && (
        <p className="mt-1" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{hint}</p>
      )}
    </div>
  );
}
