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
    <dl className={cn('ua-provenance', className)}>
      <div className="ua-provenance__item">
        <dt><Database size={13} aria-hidden="true" />{sourceLabel}</dt>
        <dd>{source}</dd>
      </div>
      <div className="ua-provenance__item">
        <dt className="sr-only">Freshness</dt>
        <dd><FreshnessIndicator state={freshness} /></dd>
      </div>
      {updatedAt ? (
        <div className="ua-provenance__item">
          <dt><History size={13} aria-hidden="true" />Updated</dt>
          <dd>{updatedAt}</dd>
        </div>
      ) : null}
    </dl>
  );
}
