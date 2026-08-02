"use client";

import { useEffect, useState } from "react";
import { Bone, Button, SectionCard, Surface } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from "@/lib/settings/platform";
import {
  formatMajorUnitInput,
  parseMajorUnitInput,
} from "@/lib/ui/merchantCopy";

type SaveState = "idle" | "saving" | "saved" | "error";

const INPUT_CLASS =
  "mt-1.5 h-8 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-primary)] outline-none focus:border-[var(--ua-action-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ua-action-primary)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";

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
    <label className="block text-[length:var(--ua-text-caption-size)] font-medium text-[var(--ua-text-primary)]">
      {label}
      {children}
      <span className="mt-1 block ua-text-metadata font-normal leading-relaxed">
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
  const [moneyInputs, setMoneyInputs] = useState<Record<string, string>>({});

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
        setMoneyInputs({});
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
      setMoneyInputs({});
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

  const moneyField = (
    key: "approvalLimitMinor" | "escalationThresholdMinor" | "highValueThresholdMinor",
    label: string,
    help: string,
  ) => {
    const value =
      moneyInputs[key] ??
      formatMajorUnitInput(settings[key], settings.reportingCurrency);
    return (
      <Field label={label} help={help}>
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          disabled={!canManage || loading || state === "saving"}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setMoneyInputs((current) => ({ ...current, [key]: next }));
            const parsed = parseMajorUnitInput(next, settings.reportingCurrency);
            if (parsed != null && parsed >= 0) patch(key, parsed);
            if (next === "") patch(key, 0);
          }}
          className={INPUT_CLASS}
        />
      </Field>
    );
  };

  const optionalRetentionField = (
    <Field
      label="Raw inbox retention (optional)"
      help="Explicit days before terminal raw ingestion payloads are purged. Leave blank until your approved retention policy supplies a period; canonical case, evidence, financial, and audit records are unaffected."
    >
      <input
        type="number"
        min={30}
        max={3650}
        disabled={!canManage || loading || state === "saving"}
        value={settings.retentionDays ?? ""}
        onChange={(event) =>
          patch(
            "retentionDays",
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
        className={INPUT_CLASS}
      />
    </Field>
  );

  if (loading) {
    return <PlatformSettingsSkeleton />;
  }

  return (
    <form onSubmit={save}>
      <Surface structure="working" className="overflow-hidden">
      {!canManage ? (
        <Surface structure="joined" className="flex items-center justify-between gap-3">
          <div>
            <p className="ua-text-working-title">Read-only access</p>
            <p className="mt-1 ua-text-caption-role">
              An owner or admin with Manage settings permission can change these
              defaults.
            </p>
          </div>
          <StatusBadge family="workflowStatus" value="view_only" size="sm" />
        </Surface>
      ) : null}

      <SectionCard
        joined
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
          {optionalRetentionField}
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
        joined
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
          {moneyField(
            "approvalLimitMinor",
            "Approval limit",
            `Amount in ${settings.reportingCurrency} major units.`,
          )}
          {moneyField(
            "escalationThresholdMinor",
            "Escalation threshold",
            `Case exposure at or above this amount requires escalation (${settings.reportingCurrency}).`,
          )}
          {moneyField(
            "highValueThresholdMinor",
            "High-value threshold",
            `Cases at or above this amount are projected as high-value notifications (${settings.reportingCurrency}).`,
          )}
          {numberField(
            "repeatCaseWindowDays",
            "Repeat-case lookback",
            "Days used to identify repeat case activity for operator context.",
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
        joined
        title="Connector controls"
        description="Write access and health notifications remain explicit workspace choices."
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border border-[var(--ua-border-subtle)] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--ua-action-primary)]"
              disabled={!canManage || loading || state === "saving"}
              checked={settings.connectorWritebackEnabled}
              onChange={(event) =>
                patch("connectorWritebackEnabled", event.target.checked)
              }
            />
            <span>
              <span className="block ua-text-body font-medium">
                Allow controlled connector write-back
              </span>
              <span className="mt-0.5 block ua-text-metadata">
                Only provider capabilities explicitly marked write-supported can
                use this permission.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-[var(--ua-border-subtle)] p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--ua-action-primary)]"
              disabled={!canManage || loading || state === "saving"}
              checked={settings.webhookHealthAlerts}
              onChange={(event) =>
                patch("webhookHealthAlerts", event.target.checked)
              }
            />
            <span>
              <span className="block ua-text-body font-medium">
                Alert on webhook health failures
              </span>
              <span className="mt-0.5 block ua-text-metadata">
                Create in-app notifications for failed, stale, or repeatedly
                retried ingestion.
              </span>
            </span>
          </label>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--ua-border-subtle)] px-4 py-3">
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
            className={`ua-text-body ${state === "error" ? "text-[var(--ua-risk-critical)]" : "text-[var(--ua-success)]"}`}
          >
            {message}
          </p>
        ) : null}
      </div>
      </Surface>
    </form>
  );
}

function PlatformSettingsSkeleton() {
  return (
    <Surface
      structure="working"
      className="overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading workspace defaults"
    >
      {[3, 4, 2].map((fieldCount, sectionIndex) => (
        <div
          key={sectionIndex}
          className="border-t border-[var(--ua-border-subtle)] px-4 py-4 first:border-t-0"
        >
          <Bone className="h-4 w-44" />
          <Bone className="mt-2 h-3 w-80 max-w-full" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: fieldCount }, (_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <Bone className="h-3 w-28" />
                <Bone className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-[var(--ua-border-subtle)] px-4 py-3">
        <Bone className="h-8 w-28" />
      </div>
    </Surface>
  );
}
