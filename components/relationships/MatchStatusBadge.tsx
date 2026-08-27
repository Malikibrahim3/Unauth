"use client";

import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/relationships/matchTypes";

const STYLES: Record<
  MatchStatus,
  { bg: string; fg: string; border: string; label: string }
> = {
  confirmed: {
    bg: "var(--uo-route-success-bg)",
    fg: "var(--uo-route-success)",
    border: "var(--uo-route-success-border)",
    label: "Confirmed",
  },
  probable: {
    bg: "var(--uo-route-warning-bg)",
    fg: "var(--uo-route-warning)",
    border: "var(--uo-route-warning-border)",
    label: "Probable",
  },
  ambiguous: {
    bg: "var(--uo-route-critical-bg)",
    fg: "var(--uo-route-critical)",
    border: "var(--uo-route-risk-critical-border)",
    label: "Needs review",
  },
  unmatched: {
    bg: "var(--uo-route-surface-muted)",
    fg: "var(--uo-route-text-secondary)",
    border: "var(--uo-route-border-default)",
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
        "ua-text-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 leading-none",
        className,
      )}
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
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
