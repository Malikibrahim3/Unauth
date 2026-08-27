import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/utils/format';

export type ValueAvailability = 'available' | 'unknown' | 'unavailable' | 'partial' | 'stale' | 'mixed';
export type UnavailablePlacement = 'inline' | 'metric' | 'cell' | 'measure';

type UnavailableValueProps = HTMLAttributes<HTMLSpanElement> & {
  kind?: Exclude<ValueAvailability, 'available'>;
  reason?: string;
  placement?: UnavailablePlacement;
};

const UNAVAILABLE_LABELS: Record<Exclude<ValueAvailability, 'available'>, string> = {
  unknown: 'Unknown',
  unavailable: 'Unavailable',
  partial: 'Partial',
  stale: 'Stale',
  mixed: 'Mixed currencies',
};

/** Keeps qualified and unavailable values distinct from verified zero. */
export function UnavailableValue({
  kind = 'unavailable',
  reason,
  placement = 'inline',
  className,
  ...props
}: UnavailableValueProps) {
  const label = UNAVAILABLE_LABELS[kind];
  return (
    <span
      className={cn(
        'ua-product-value ua-product-value--unavailable',
        `ua-product-value--${kind}`,
        `ua-product-value--placement-${placement}`,
        className,
      )}
      data-value-state={kind}
      data-placement={placement}
      title={reason ? `${label}: ${reason}` : label}
      {...props}
    >
      {placement === 'measure' ? <span className="ua-product-value__track" aria-hidden="true" /> : null}
      <span aria-hidden="true">—</span>
      <span className="ua-product-value__state">{label}</span>
      {reason ? <span className="sr-only">. {reason}</span> : null}
    </span>
  );
}

export function formatMoneyMinorUnits(minorUnits: number, currency: string): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new TypeError('Money values must be a safe integer count of the currency\'s smallest unit.');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new TypeError('Money values require an ISO 4217 currency code.');
  }
  return formatMoney(minorUnits, currency);
}

export type MoneyValueProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  minorUnits: number | null;
  currency: string | null;
  availability?: ValueAvailability;
  reason?: string;
  prefix?: ReactNode;
  placement?: UnavailablePlacement;
};

/** Financial display primitive; never coerces null, mixed scope or missing currency to zero. */
export function MoneyValue({
  minorUnits,
  currency,
  availability,
  reason,
  prefix,
  placement,
  className,
  ...props
}: MoneyValueProps) {
  const resolvedAvailability = availability ?? (minorUnits == null ? 'unknown' : 'available');
  const isQualified = resolvedAvailability === 'partial' || resolvedAvailability === 'stale';

  if (!isQualified && resolvedAvailability !== 'available') {
    return <UnavailableValue kind={resolvedAvailability} reason={reason} placement={placement} className={className} {...props} />;
  }
  if (minorUnits == null || !currency) {
    return (
      <UnavailableValue
        kind={isQualified ? resolvedAvailability : 'unknown'}
        reason={reason ?? (!currency ? 'Currency scope is missing.' : 'No verified amount was supplied.')}
        placement={placement}
        className={className}
        {...props}
      />
    );
  }

  const formatted = formatMoneyMinorUnits(minorUnits, currency.toUpperCase());
  return (
    <span
      className={cn('ua-product-value ua-product-value--money', isQualified && `ua-product-value--${resolvedAvailability}`, className)}
      data-value-state={isQualified ? resolvedAvailability : minorUnits === 0 ? 'verified-zero' : 'available'}
      title={isQualified && reason ? `${UNAVAILABLE_LABELS[resolvedAvailability]}: ${reason}` : undefined}
      {...props}
    >
      {prefix}
      {formatted}
      {isQualified ? <span className="ua-product-value__state">{UNAVAILABLE_LABELS[resolvedAvailability]}</span> : null}
      {!isQualified && minorUnits === 0 ? <span className="sr-only">, verified zero</span> : null}
      {isQualified && reason ? <span className="sr-only">. {reason}</span> : null}
    </span>
  );
}
