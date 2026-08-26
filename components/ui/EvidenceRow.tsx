import type { ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Canonical evidence / checklist row (spec §6.4, §7.1).
 *
 * Completion is carried by a glyph *and* an accessible label, never by colour
 * alone. Rows join with a 1px rule rather than becoming individual cards.
 */
export function EvidenceRow({
  state,
  text,
  timestamp,
  className,
}: {
  state: 'pending' | 'confirmed';
  text: ReactNode;
  timestamp?: ReactNode;
  className?: string;
}) {
  const confirmed = state === 'confirmed';
  return (
    <div
      className={cn(
        'flex min-h-[var(--uo-route-table-row-height)] items-center gap-[var(--uo-route-space-2-5)] text-[length:var(--uo-route-text-dense-size)] leading-[var(--uo-route-text-dense-leading)] text-[var(--uo-route-text-secondary)]',
        className,
      )}
    >
      {confirmed ? (
        <Check size={14} strokeWidth={1.5} className="shrink-0 text-[var(--uo-route-success)]" aria-hidden="true" />
      ) : (
        <Circle size={14} strokeWidth={1.5} className="shrink-0 text-[var(--uo-route-icon-secondary)]" aria-hidden="true" />
      )}
      <span className="sr-only">{confirmed ? 'Confirmed:' : 'Outstanding:'}</span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {timestamp ? (
        <span className="shrink-0 text-[length:var(--uo-route-text-caption-size)] leading-[var(--uo-route-text-caption-leading)] text-[var(--uo-route-text-tertiary)]">
          {timestamp}
        </span>
      ) : null}
    </div>
  );
}
