import type { IdentityTimelineEntry } from '@/app/api/customers/[id]/route';
import IdentityTimeline from '@/components/customers/IdentityTimeline';
import { ChevronRight } from 'lucide-react';

interface IdentityChangesDisclosureProps {
  entries: IdentityTimelineEntry[];
  variantCount: number;
}

export default function IdentityChangesDisclosure({ entries, variantCount }: IdentityChangesDisclosureProps) {
  if (entries.length === 0) return null;

  const summary =
    variantCount > 0
      ? `${variantCount} identifier change${variantCount > 1 ? 's' : ''} across orders`
      : 'How identifiers evolved over time';

  return (
    <details className="group rounded-md border" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
      <summary
        className="cursor-pointer list-none px-4 py-3 text-caption font-semibold [&::-webkit-details-marker]:hidden"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="inline-flex items-center gap-2">
          <ChevronRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            style={{ color: 'var(--text-tertiary)' }}
          />
          Identifier changes ({entries.length})
          <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
            - {summary}
          </span>
        </span>
      </summary>
      <div className="border-t px-2 pb-2" style={{ borderColor: 'var(--border-muted)' }}>
        <IdentityTimeline entries={entries} />
      </div>
    </details>
  );
}
