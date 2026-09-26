import type { ReactNode } from 'react';
import { Database, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';

export type ProvenanceProps = {
  source: ReactNode;
  sourceLabel?: string;
  freshness: FreshnessState;
  updatedAt?: ReactNode;
  className?: string;
};

/** Compact source/freshness contract for record headers and analytical summaries. */
export function Provenance({ source, sourceLabel = 'Source', freshness, updatedAt, className }: ProvenanceProps) {
  return (
    <dl className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-[#64686d]', className)}>
      <div className="flex items-center gap-2">
        <dt className="inline-flex items-center gap-1"><Database size={13} aria-hidden="true" />{sourceLabel}</dt>
        <dd className="m-0 font-medium text-[#40454a]">{source}</dd>
      </div>
      <div className="flex items-center">
        <dt className="sr-only">Freshness</dt>
        <dd><FreshnessIndicator state={freshness} /></dd>
      </div>
      {updatedAt ? (
        <div className="flex items-center gap-2">
          <dt className="inline-flex items-center gap-1"><History size={13} aria-hidden="true" />Updated</dt>
          <dd className="m-0 font-mono">{updatedAt}</dd>
        </div>
      ) : null}
    </dl>
  );
}
