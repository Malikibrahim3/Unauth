"use client";

import { useEffect, useState } from "react";
import { Button, Card, SectionCard } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from "@/lib/settings/platform";

type SaveState = "idle" | "saving" | "saved" | "error";

const INPUT_CLASS =
  "mt-1.5 h-8 w-full rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[12px] font-medium text-[var(--text-primary)]">
      {label}
      {children}
      <span className="mt-1 block text-xs font-normal leading-relaxed text-[var(--text-tertiary)]">
        {help}
      </span>
    </label>
  );
}

export function PlatformSettingsClient({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<PlatformSettings>(
    DEFAULT_PLATFORM_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/settings/platform", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          settings?: PlatformSettings;
          error?: string;
        };
        if (!response.ok || !body.settings)
          throw new Error(body.error ?? "Unable to load platform settings.");
        setSettings(body.settings);
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setState("error");
          setMessage((error as Error).message);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  function patch<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
    setState("idle");
    setMessage(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = (await response.json().catch(() => ({}))) as {
        settings?: PlatformSettings;
        error?: string;
      };
      if (!response.ok || !body.settings)
        throw new Error(body.error ?? "Unable to save platform settings.");
      setSettings(body.settings);
      setState("saved");
      setMessage("Financial and workflow defaults saved.");
    } catch (error) {
      setState("error");
      setMessage((error as Error).message);
    }
  }

  const numberField = (
    key: keyof PlatformSettings,
    label: string,
    help: string,
    min = 0,
    max?: number,
  ) => (
    <Field label={label} help={help}>
      <input
        type="number"
        min={min}
        max={max}
        disabled={!canManage || loading || state === "saving"}
        value={settings[key] as number}
        onChange={(event) => patch(key, Number(event.target.value) as never)}
        className={INPUT_CLASS}
      />
    </Field>
  );

  return (
    <form onSubmit={save} className="space-y-3">
      {!canManage ? (
        <Card unstyled
          variant="inset"
          className="flex items-center justify-between gap-3 p-4"
        >
          <div>
            <p className="text-sm font-semibold">Read-only access</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              An owner or admin with Manage settings permission can change these
              defaults.
            </p>
          </div>
          <StatusBadge family="workflowStatus" value="view_only" size="sm" />
        </Card>
      ) : null}
      {loading ? (
        <Card unstyled
          variant="inset"
          className="p-4 text-sm text-[var(--text-secondary)]"
          role="status"
        >
          Loading workspace defaults…
        </Card>
      ) : null}

      <SectionCard
        title="Reporting and retention"
        description="Display and lifecycle defaults used across reports, exports, and stored source records."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Reporting currency"
            help="Three-letter ISO currency used for workspace defaults. Mixed currencies remain separated in financial reports."
          >
            <input
              maxLength={3}
              pattern="[A-Z]{3}"
              disabled={!canManage || loading || state === "saving"}
              value={settings.reportingCurrency}
              onChange={(event) =>
                patch("reportingCurrency", event.target.value.toUpperCase())
              }
              className={INPUT_CLASS}
            />
          </Field>
          <Field
            label="Timezone"
            help="IANA timezone used for deadlines, filters, exports, and audit timestamps."
          >
            <input
              disabled={!canManage || loading || state === "saving"}
              value={settings.timezone}
              onChange={(event) => patch("timezone", event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          {numberField(
            "retentionDays",
            "Retention period",
            "Days before eligible source records reach their retention deadline.",
            30,
            3650,
          )}
          {numberField(
            "defaultDateRangeDays",
            "Default report range",
            "Days initially shown on reporting and operational views.",
            1,
            366,
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Decision and financial policy"
        description="Defaults guide operators; they never replace case evidence or silently execute a payout."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Matching policy"
            help="Controls whether ambiguous links are blocked, balanced, or queued for review."
          >
            <select
              disabled={!canManage || loading || state === "saving"}
              value={settings.matchingPolicy}
              onChange={(event) =>
                patch(
                  "matchingPolicy",
                  event.target.value as PlatformSettings["matchingPolicy"],
                )
              }
              className={INPUT_CLASS}
            >
              <option value="strict">Strict — block ambiguous matches</option>
              <option value="balanced">
                Balanced — accept strong evidence
              </option>
              <option value="review_ambiguous">
                Review ambiguous — queue uncertain links
              </option>
            </select>
          </Field>
          <Field
            label="Cost basis"
            help="Basis used when estimating merchant loss where an actual unit cost is unavailable."
          >
            <select
              disabled={!canManage || loading || state === "saving"}
              value={settings.costBasis}
              onChange={(event) =>
                patch(
                  "costBasis",
                  event.target.value as PlatformSettings["costBasis"],
                )
              }
              className={INPUT_CLASS}
            >
              <option value="actual">Actual cost</option>
              <option value="average">Average cost</option>
              <option value="standard">Standard cost</option>
            </select>
          </Field>
          {numberField(
            "defaultDeadlineHours",
            "Default task deadline",
            "Hours from task creation before work becomes due.",
            1,
            8760,
          )}
          {numberField(
            "approvalLimitMinor",
            "Approval limit (minor units)",
            "Example: 100000 means £1,000.00 when the reporting currency is GBP.",
            0,
          )}
          {numberField(
            "escalationThresholdMinor",
            "Escalation threshold (minor units)",
            "Payout exposure at or above this amount requires escalation.",
            0,
          )}
          {numberField(
            "highValueThresholdMinor",
            "High-value threshold (minor units)",
            "Cases at or above this amount are projected as high-value notifications.",
            0,
          )}
          {numberField(
            "repeatCaseWindowDays",
            "Repeat-case lookback",
            "Days used to identify repeat payout activity for operator context.",
            1,
            730,
          )}
          {numberField(
            "syncFrequencyMinutes",
            "Scheduled sync frequency",
            "Minutes between scheduled connector sync attempts.",
            5,
            10080,
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Connector controls"
        description="Write access and health notifications remain explicit workspace choices."
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border border-[var(--border-muted)] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              disabled={!canManage || loading || state === "saving"}
              checked={settings.connectorWritebackEnabled}
              onChange={(event) =>
                patch("connectorWritebackEnabled", event.target.checked)
              }
            />
            <span>
              <span className="block text-sm font-medium">
                Allow controlled connector write-back
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                Only provider capabilities explicitly marked write-supported can
                use this permission.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-[var(--border-muted)] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              disabled={!canManage || loading || state === "saving"}
              checked={settings.webhookHealthAlerts}
              onChange={(event) =>
                patch("webhookHealthAlerts", event.target.checked)
              }
            />
            <span>
              <span className="block text-sm font-medium">
                Alert on webhook health failures
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                Create in-app notifications for failed, stale, or repeatedly
                retried ingestion.
              </span>
            </span>
          </label>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        {canManage ? (
          <Button
            type="submit"
            loading={state === "saving"}
            disabled={loading || state === "saving"}
          >
            {state === "saving" ? "Saving defaults…" : "Save defaults"}
          </Button>
        ) : null}
        {message ? (
          <p
            role={state === "error" ? "alert" : "status"}
            className={`text-sm ${state === "error" ? "text-[var(--risk-critical)]" : "text-[var(--success)]"}`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
