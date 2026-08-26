'use client';

import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useChangedValueHighlight } from '@/lib/design/useChangedValueHighlight';
import { UnavailableValue, type ValueAvailability } from './ProductValue';

export type MetricKind = 'money' | 'count' | 'rate' | 'duration';
export type MetricOutcome = 'prevented' | 'recovered' | 'realised' | 'open' | 'identified';
export type MetricAvailability = ValueAvailability | 'verified-zero';

export interface MetricDelta {
  value: string;
  direction: 'up' | 'down' | 'flat';
  label: string;
}

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  kind?: MetricKind;
  /** non-'available' delegates the value to UnavailableValue */
  availability?: MetricAvailability;
  unit?: string;
  detail?: ReactNode;
  /** omit entirely when there is no delta to report */
  delta?: MetricDelta;
  /** tints only the leading marker, never the value text */
  outcome?: MetricOutcome;
  icon?: LucideIcon;
  href?: string;
  density?: 'default' | 'compact';
  size?: 'hero';
  microchart?: ReactNode;
}

const DELTA_ICON: Record<MetricDelta['direction'], typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

function isLongValue(value: ReactNode): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  return String(value).length > 10;
}

export function MetricCard({
  label,
  value,
  kind = 'count',
  availability = 'available',
  unit,
  detail,
  delta,
  outcome,
  icon: Icon,
  href,
  density = 'default',
  size,
  microchart,
}: MetricCardProps) {
  const isHero = size === 'hero';
  const highlightKey = typeof value === 'string' || typeof value === 'number' ? value : null;
  const highlighting = useChangedValueHighlight(highlightKey);
  const isAvailable = availability === 'available' || availability === 'verified-zero';
  const long = isAvailable && isLongValue(value);

  const body = (
    <div
      className={cn(
        'ua-metric-card ua-card ua-card--panel',
        isHero ? 'ua-metric-card--hero' : density === 'compact' ? 'ua-card--density-compact' : 'ua-card--density-default',
        outcome ? `ua-metric-card--outcome-${outcome}` : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="ua-metric-card__label ua-text-eyebrow">{label}</span>
        {Icon ? <Icon aria-hidden="true" className="ua-metric-card__icon" /> : null}
      </div>

      <div
        className={cn(
          'ua-metric-card__value mt-3 ua-text-kpi',
          kind === 'money' && isAvailable && 'ua-text-money',
          long && 'ua-metric-card__value--long',
          highlighting && 'ua-value-wash',
        )}
      >
        {isAvailable ? (
          <>
            {value}
            {availability === 'verified-zero' ? <span className="sr-only">, verified zero</span> : null}
          </>
        ) : (
          <UnavailableValue kind={availability} placement="metric" />
        )}
        {unit && isAvailable ? <span className="ua-text-unit">{unit}</span> : null}
      </div>

      {delta && isAvailable
        ? (() => {
            const DeltaIcon = DELTA_ICON[delta.direction];
            return (
              <div className={cn('ua-text-delta mt-1 flex items-center gap-1', `ua-text-delta--${delta.direction}`)}>
                <DeltaIcon size={12} aria-hidden="true" />
                <span>{delta.value}</span>
                <span className="sr-only">{delta.label}</span>
              </div>
            );
          })()
        : null}

      {isHero && microchart && (
        <div className="mt-3" aria-hidden="true">
          {microchart}
        </div>
      )}

      {detail && <p className="ua-metric-card__hint ua-text-caption-role mt-1">{detail}</p>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="ua-metric-card__link">
        {body}
      </a>
    );
  }
  return body;
}
