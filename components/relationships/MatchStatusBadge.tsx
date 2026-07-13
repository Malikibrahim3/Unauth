"use client";

import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/relationships/matchTypes";

const STYLES: Record<
  MatchStatus,
  { bg: string; fg: string; border: string; label: string }
> = {
  confirmed: {
    bg: "var(--success-bg)",
    fg: "var(--success)",
    border: "var(--success-bd)",
    label: "Confirmed",
  },
  probable: {
    bg: "var(--warning-bg)",
    fg: "var(--warning)",
    border: "var(--warning-bd)",
    label: "Probable",
  },
  ambiguous: {
    bg: "var(--danger-bg)",
    fg: "var(--danger)",
    border: "var(--risk-critical-bd)",
    label: "Needs review",
  },
  unmatched: {
    bg: "var(--surface-sunken)",
    fg: "var(--text-secondary)",
    border: "var(--border)",
    label: "Unmatched",
  },
};

/**
 * Neutral badge for a match status. Confirmed/probable/ambiguous/unmatched are
 * distinct states — the badge never implies a verdict about the customer.
 */
export function MatchStatusBadge({
  status,
  className,
}: {
  status: MatchStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none",
        className,
      )}
      style={{
        background: s.bg,
        color: s.fg,
        boxShadow: `inset 0 0 0 1px ${s.border}`,
      }}
    >
      <span
        className="h-[4px] w-[4px] rounded-full"
        style={{ background: s.fg }}
      />
      {s.label}
    </span>
  );
}
