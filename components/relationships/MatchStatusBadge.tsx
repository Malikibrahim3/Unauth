'use client';

import { cn } from '@/lib/utils';
import type { MatchStatus } from '@/lib/relationships/matchTypes';

const STYLES: Record<MatchStatus, { bg: string; fg: string; border: string; label: string }> = {
  confirmed: { bg: '#DCFCE7', fg: '#16A34A', border: '#BBF7D0', label: 'Confirmed' },
  probable: { bg: '#FEF3C7', fg: '#D97706', border: '#FDE68A', label: 'Probable' },
  ambiguous: { bg: '#FEE2E2', fg: '#DC2626', border: '#FECACA', label: 'Needs review' },
  unmatched: { bg: '#F1F1F0', fg: '#6B7280', border: '#E4E4E3', label: 'Unmatched' },
};

/**
 * Neutral badge for a match status. Confirmed/probable/ambiguous/unmatched are
 * distinct states — the badge never implies a verdict about the customer.
 */
export function MatchStatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none',
        className,
      )}
      style={{ background: s.bg, color: s.fg, boxShadow: `inset 0 0 0 1px ${s.border}` }}
    >
      <span className="h-[4px] w-[4px] rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}
