"use client";

import { useState } from "react";
import { Bell, MailX } from "lucide-react";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { NotificationKind } from "@/lib/collaboration/notificationPreferences";

const KINDS: Array<{
  kind: NotificationKind;
  label: string;
  description: string;
}> = [
  {
    kind: "assignment",
    label: "Assignments",
    description: "Work or payout cases assigned to you.",
  },
  {
    kind: "mention",
    label: "Mentions",
    description: "A teammate mentions you in a case comment.",
  },
  {
    kind: "approaching_deadline",
    label: "Deadlines",
    description: "Owned work approaches or passes its due time.",
  },
  {
    kind: "evidence_update",
    label: "Evidence updates",
    description: "New or missing source evidence changes the next action.",
  },
  {
    kind: "decision_request",
    label: "Decision requests",
    description: "A payout case is ready for merchant review.",
  },
  {
    kind: "recovery_outcome",
    label: "Recovery outcomes",
    description:
      "A carrier, 3PL, supplier or payment source reports an outcome.",
  },
  {
    kind: "sync_failure",
    label: "Connection health",
    description: "A connected provider needs credentials or a retry.",
  },
  {
    kind: "high_value_case_alert",
    label: "High-value cases",
    description: "Payout exposure exceeds the operational review threshold.",
  },
  {
    kind: "daily_work_summary",
    label: "Daily work summary",
    description: "A compact summary of owned and overdue work.",
  },
  {
    kind: "scheduled_report",
    label: "Scheduled reports",
    description: "A requested report is ready to review.",
  },
];

type Pref = { kind: string; in_app_enabled: boolean; email_enabled: boolean };

export function NotificationPreferencesForm({ initial }: { initial: Pref[] }) {
  const [prefs, setPrefs] = useState(
    () => new Map(initial.map((value) => [value.kind, value])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function update(kind: NotificationKind, value: boolean) {
    const previous = prefs.get(kind) ?? {
      kind,
      in_app_enabled: true,
      email_enabled: false,
    };
    const next = { ...previous, in_app_enabled: value, email_enabled: false };
    setPrefs((current) => new Map(current).set(kind, next));
    setSaving(kind);
    setStatus("Saving preference…");
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setPrefs((current) => new Map(current).set(kind, previous));
      setStatus("Unable to save. Your previous preference was restored.");
    } else
      setStatus(
        `${KINDS.find((item) => item.kind === kind)?.label ?? kind} preference saved.`,
      );
    setSaving(null);
  }

  return (
    <div className="space-y-5">
      <Card unstyled variant="inset" className="flex items-start gap-3 p-4">
        <Bell className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
        <div>
          <h2 className="text-sm font-semibold">In-app delivery</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Choose which case updates appear in your notification inbox.
          </p>
        </div>
      </Card>
      <p
        aria-live="polite"
        className="min-h-5 text-sm text-[var(--text-secondary)]"
      >
        {status}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map((item) => {
          const pref = prefs.get(item.kind) ?? {
            kind: item.kind,
            in_app_enabled: true,
            email_enabled: false,
          };
          const isSaving = saving === item.kind;
          return (
            <Card unstyled
              key={item.kind}
              variant="flat"
              className="flex items-start justify-between gap-4 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{item.label}</h2>
                  {isSaving ? (
                    <StatusBadge family="workflowStatus" value="saving" size="sm" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pref.in_app_enabled}
                aria-label={`${item.label} in app`}
                disabled={isSaving}
                onClick={() => update(item.kind, !pref.in_app_enabled)}
                className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60"
                style={{
                  background: pref.in_app_enabled
                    ? "var(--accent)"
                    : "var(--border)",
                }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                  style={{ left: pref.in_app_enabled ? 22 : 2 }}
                />
              </button>
            </Card>
          );
        })}
      </div>
      <Card unstyled variant="flat" className="flex items-start gap-3 p-4">
        <MailX className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" />
        <div>
          <h2 className="text-sm font-semibold">
            Email delivery is not enabled
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Email notifications are coming later. Your in-app preferences stay
            active in the meantime.
          </p>
        </div>
      </Card>
    </div>
  );
}
