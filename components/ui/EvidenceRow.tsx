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
        'flex min-h-[var(--ua-table-row-height)] items-center gap-[var(--ua-space-2-5)] text-[length:var(--ua-text-small-size)] leading-[var(--ua-text-small-leading)] text-[var(--ua-text-secondary)]',
        className,
      )}
    >
      {confirmed ? (
        <Check size={14} strokeWidth={1.5} className="shrink-0 text-[var(--ua-success)]" aria-hidden="true" />
      ) : (
        <Circle size={14} strokeWidth={1.5} className="shrink-0 text-[var(--ua-icon-secondary)]" aria-hidden="true" />
      )}
      <span className="sr-only">{confirmed ? 'Confirmed:' : 'Outstanding:'}</span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {timestamp ? (
        <span className="shrink-0 text-[length:var(--ua-text-caption-size)] leading-[var(--ua-text-caption-leading)] text-[var(--ua-text-tertiary)]">
          {timestamp}
        </span>
      ) : null}
    </div>
  );
}
