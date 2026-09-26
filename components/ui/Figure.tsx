import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FigureState =
  | 'verified-zero'
  | 'no-records'
  | 'unavailable'
  | 'partial'
  | 'stale'
  | 'unreconciled';

export interface FigureProps {
  state: FigureState;
  value?: ReactNode;
  label?: string;
  source?: string;
  missingCount?: number;
  asAt?: string;
  exceptionCount?: number;
  href?: string;
  className?: string;
}
const stateLabels: Record<FigureState, string> = {
  'verified-zero': 'Verified zero',
  'no-records': 'No records',
  unavailable: 'Unavailable',
  partial: 'Partial',
  stale: 'Stale',
  unreconciled: 'Unreconciled',
};

function stateDetail({
  state,
  source,
  missingCount,
  asAt,
  exceptionCount,
}: Pick<FigureProps, 'state' | 'source' | 'missingCount' | 'asAt' | 'exceptionCount'>) {
  switch (state) {
    case 'verified-zero':
      return 'Reconciled from source data';
    case 'no-records':
      return 'No records in this scope';
    case 'unavailable':
      return source ? `Unavailable · ${source}` : 'Source unavailable';
    case 'partial':
      return typeof missingCount === 'number'
        ? `${missingCount} ${missingCount === 1 ? 'source' : 'sources'} missing`
        : 'Source coverage is incomplete';
    case 'stale':
      return asAt ? `As at ${asAt}` : 'Last update is not current';
    case 'unreconciled':
      return typeof exceptionCount === 'number'
        ? `${exceptionCount} unreconciled ${exceptionCount === 1 ? 'exception' : 'exceptions'}`
        : 'Review the unreconciled exceptions';
  }
}

/** A truthful compact figure that does not turn absence or source gaps into zeroes. */
export function Figure({
  state,
  value,
  label,
  source,
  missingCount,
  asAt,
  exceptionCount,
  href,
  className,
}: FigureProps) {
  const detail = stateDetail({ state, source, missingCount, asAt, exceptionCount });
  const resolvedValue = value ?? (state === 'verified-zero' ? '0' : '—');

  return (
    <div className={cn('font-semibold tabular-nums text-[#1c1f23]', `font-semibold tabular-nums text-[#1c1f23]${state}`, className)} data-figure-state={state}>
      {label ? <p className="text-[11px] leading-[1.45] text-[#64686d]">{label}</p> : null}
      <div className="border-t border-[#e4e3e0]">
        <p className="font-semibold tabular-nums text-[#1c1f23]">{resolvedValue}</p>
        <span className="font-semibold tabular-nums text-[#1c1f23]">{stateLabels[state]}</span>
      </div>
      <p className="text-[11px] leading-[1.45] text-[#64686d]">
        {detail}
        {state === 'unreconciled' && href ? <a className="font-semibold tabular-nums text-[#1c1f23]" href={href}>Review</a> : null}
      </p>
    </div>
  );
}
