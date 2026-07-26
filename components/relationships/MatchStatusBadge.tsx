"use client";

import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/relationships/matchTypes";

const STYLES: Record<
  MatchStatus,
  { bg: string; fg: string; border: string; label: string }
> = {
  confirmed: {
    bg: "var(--ua-success-bg)",
    fg: "var(--ua-success)",
    border: "var(--ua-success-border)",
    label: "Confirmed",
  },
  probable: {
    bg: "var(--ua-warning-bg)",
    fg: "var(--ua-warning)",
    border: "var(--ua-warning-border)",
    label: "Probable",
  },
  ambiguous: {
    bg: "var(--ua-critical-bg)",
    fg: "var(--ua-critical)",
    border: "var(--ua-risk-critical-border)",
    label: "Needs review",
  },
  unmatched: {
    bg: "var(--ua-surface-muted)",
    fg: "var(--ua-text-secondary)",
    border: "var(--ua-border-default)",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[length:var(--ua-text-caption-size)] font-semibold leading-none",
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
