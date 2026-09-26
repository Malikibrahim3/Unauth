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
        'flex min-h-11 items-center gap-3 text-[12px] leading-5 text-[#64686d]',
        className,
      )}
    >
      {confirmed ? (
        <Check size={14} strokeWidth={1.5} className="shrink-0 text-[#1a6b43]" aria-hidden="true" />
      ) : (
        <Circle size={14} strokeWidth={1.5} className="shrink-0 text-[#64686d]" aria-hidden="true" />
      )}
      <span className="sr-only">{confirmed ? 'Confirmed:' : 'Outstanding:'}</span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {timestamp ? (
        <span className="shrink-0 text-[length:11.5px] leading-[1.45] text-[#6f6a63]">
          {timestamp}
        </span>
      ) : null}
    </div>
  );
}
