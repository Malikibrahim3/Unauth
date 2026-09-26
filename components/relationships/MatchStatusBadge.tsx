"use client";

import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/relationships/matchTypes";

const STYLES: Record<
  MatchStatus,
  { bg: string; fg: string; border: string; label: string }
> = {
  confirmed: {
    bg: "#eaf5ef",
    fg: "#1a6b43",
    border: "#bfdecf",
    label: "Confirmed",
  },
  probable: {
    bg: "#fff3e9",
    fg: "#7a5310",
    border: "#ead8b6",
    label: "Probable",
  },
  ambiguous: {
    bg: "#fdf0e6",
    fg: "#b0431a",
    border: "#edc6b5",
    label: "Needs review",
  },
  unmatched: {
    bg: "#f4f3f1",
    fg: "#64686d",
    border: "#e4e3e0",
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
        "text-[11px] font-medium leading-4 text-[#64686d] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 leading-none",
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
