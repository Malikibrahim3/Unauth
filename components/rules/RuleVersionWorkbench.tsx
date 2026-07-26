"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  History,
  Pencil,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  Button,
  Modal,
  Card,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  RuleBuilderDrawer,
  type RuleDraftPayload,
} from "@/components/rules/RuleBuilderDrawer";
import { summarizeConditions, ACTION_LABELS } from "@/lib/rules/summary";
import type { MerchantRule, RuleCondition } from "@/lib/rules-engine";
import { FIELD_DEFS_BY_NAME, FIELD_LABELS } from "@/lib/rules/fields";
import { formatDateTime } from "@/lib/utils/format";

export type RuleVersionRecord = {
  id: string;
  version: number;
  status: "draft" | "published" | "retired" | "discarded";
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: MerchantRule["action"];
  condition_operator: MerchantRule["condition_operator"];
  priority: number;
  created_at: string;
  published_at: string | null;
  published_by?: string | null;
  supersedes_version_id?: string | null;
};

type SimulationResult = {
  version: number;
  simulation: {
    matched: boolean;
    recommendedAction: string;
    matchedConditions: RuleCondition[];
    writesPerformed: number;
  };
  notice: string;
};

type PublishPreview = {
  version: number;
  dataRequirements: string[];
  conflicts: Array<{ ruleId: string; name: string; reason: string }>;
};

function asRule(ruleId: string, version: RuleVersionRecord): MerchantRule {
  return {
    id: ruleId,
    merchant_id: "",
    name: version.name,
    description: version.description,
    is_active: version.status === "published",
    priority: version.priority,
    conditions: version.conditions,
    action: version.action,
    condition_operator: version.condition_operator,
  };
}

function valueChanged(a: unknown, b: unknown) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

const UNAVAILABLE = "__unavailable__";

const OPERATOR_COPY: Record<RuleCondition["operator"], string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  not_in: "is not one of",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  contains: "contains",
  not_contains: "does not contain",
  contains_any: "contains any of",
  exists: "is present",
};

function readableCondition(condition: RuleCondition): string {
  const field = FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ");
  const definition = FIELD_DEFS_BY_NAME[condition.field];
  const values = (Array.isArray(condition.value) ? condition.value : [condition.value])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => {
      const option = definition?.options?.find((candidate) => candidate.value === value);
      return `“${option?.label ?? String(value).replaceAll("_", " ")}”`;
    });
  const comparison = condition.operator === "exists" ? "" : ` ${values.join(", ")}`;
  const operator = OPERATOR_COPY[condition.operator] ?? condition.operator.replaceAll("_", " ");
  return `If ${field.toLowerCase()} ${operator}${comparison}`;
}

function matchingSampleValue(condition: RuleCondition): string {
  const def = FIELD_DEFS_BY_NAME[condition.field];
  const value = condition.value;
  if (
    condition.operator === "contains" ||
    condition.operator === "contains_any"
  ) {
    return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  }
  if (condition.operator === "not_contains") return "";
  if (
    (condition.operator === "in" || condition.operator === "not_in") &&
    Array.isArray(value)
  ) {
    if (condition.operator === "in") return String(value[0] ?? "");
    return String(
      def?.options?.find((option) => !value.includes(option.value))?.value ??
        "",
    );
  }
  if (typeof value === "number") {
    if (condition.operator === "gt") return String(value + 1);
    if (condition.operator === "lt") return String(value - 1);
  }
  if (condition.operator === "neq") {
    if (def?.type === "boolean") return String(!value);
    if (def?.type === "enum")
      return String(
        def.options?.find((option) => option.value !== value)?.value ?? "",
      );
    if (typeof value === "number") return String(value + 1);
    return `${String(value)}-different`;
  }
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function sampleValuesFor(conditions: RuleCondition[]): Record<string, string> {
  return Object.fromEntries(
    conditions.map((condition) => [
      condition.field,
      matchingSampleValue(condition),
    ]),
  );
}

export function RuleVersionWorkbench({
  ruleId,
  initialVersions,
  canManage,
}: {
  ruleId: string;
  initialVersions: RuleVersionRecord[];
  canManage: boolean;
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(
    null,
  );
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const draft = versions.find((version) => version.status === "draft") ?? null;
  const published =
    versions.find((version) => version.status === "published") ?? null;
  const display = draft ?? published ?? versions[0]!;
  const simulationConditions = useMemo(
    () => [
      ...new Map(
        display.conditions.map((condition) => [condition.field, condition]),
      ).values(),
    ],
    [display.conditions],
  );
  const [signals, setSignals] = useState<Record<string, string>>(() =>
    sampleValuesFor(simulationConditions),
  );
  const changes = useMemo(() => {
    if (!draft || !published) return [];
    return [
      ["Name", published.name, draft.name],
      [
        "Description",
        published.description || "None",
        draft.description || "None",
      ],
      [
        "Conditions",
        summarizeConditions(published.conditions, published.condition_operator),
        summarizeConditions(draft.conditions, draft.condition_operator),
      ],
      [
        "Recommendation",
        ACTION_LABELS[published.action],
        ACTION_LABELS[draft.action],
      ],
      ["Priority", String(published.priority), String(draft.priority)],
    ].filter(([, before, after]) => valueChanged(before, after));
  }, [draft, published]);

  async function refresh() {
    const response = await fetch(`/api/rules/${ruleId}/versions`, {
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error ?? "Could not reload versions");
    setVersions(body.versions ?? []);
  }

  async function saveDraft(payload: RuleDraftPayload) {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch(
        draft
          ? `/api/rules/${ruleId}/versions/${draft.id}`
          : `/api/rules/${ruleId}/versions`,
        {
          method: draft ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Draft could not be saved");
      await refresh();
      setMessage({
        tone: "success",
        text: draft
          ? "Draft updated. The published rule is unchanged."
          : "Draft created. Test it before publishing.",
      });
      return true;
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Draft could not be saved",
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function simulate() {
    setBusy("simulate");
    setMessage(null);
    setSimulation(null);
    try {
      const payload = Object.fromEntries(
        simulationConditions.map((condition) => {
          const raw = signals[condition.field] ?? UNAVAILABLE;
          const def = FIELD_DEFS_BY_NAME[condition.field];
          if (raw === UNAVAILABLE) return [condition.field, null];
          if (def?.type === "integer" || def?.type === "decimal")
            return [condition.field, Number(raw)];
          if (def?.type === "boolean") return [condition.field, raw === "true"];
          if (def?.type === "string_array")
            return [
              condition.field,
              raw
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            ];
          return [condition.field, raw];
        }),
      );
      const response = await fetch(`/api/rules/${ruleId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Simulation failed");
      setSimulation(body);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Simulation failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function previewPublish() {
    setBusy("preview");
    setMessage(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish preview failed");
      setPublishPreview(body);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Publish preview failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function confirmPublish() {
    setBusy("publish");
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          acceptConflicts: Boolean(publishPreview?.conflicts.length),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish failed");
      setPublishPreview(null);
      await refresh();
      setMessage({
        tone: "success",
        text: `Version ${body.published.version} published atomically.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Publish failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function rollback(version: number) {
    setBusy(`rollback-${version}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Rollback draft failed");
      await refresh();
      setMessage({
        tone: "success",
        text: `Version ${version} copied into a new draft. Review and publish it explicitly.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Rollback failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function discardDraft() {
    if (!draft) return;
    setBusy("discard");
    try {
      const response = await fetch(
        `/api/rules/${ruleId}/versions/${draft.id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Draft could not be discarded");
      await refresh();
      setMessage({
        tone: "success",
        text: "Draft discarded. The published rule was unchanged.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Draft could not be discarded",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor:
              message.tone === "error" ? "var(--ua-critical)" : "var(--ua-success)",
            color:
              message.tone === "error"
                ? "var(--ua-critical)"
                : "var(--ua-text-primary)",
            background: "var(--ua-surface-primary)",
          }}
        >
          {message.text}
        </div>
      ) : null}
      <Card unstyled variant="panel" className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge family="workflowStatus" value={display.status} />
              <span className="font-mono text-xs text-[var(--ua-text-tertiary)]">
                v{display.version}
              </span>
              {draft && published ? (
                <span className="text-xs text-[var(--ua-text-secondary)]">
                  Published v{published.version} remains active
                </span>
              ) : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm text-[var(--ua-text-secondary)]">
              When{" "}
              <strong className="text-[var(--ua-text-primary)]">
                {display.condition_operator === "or" ? "any" : "all"}
              </strong>{" "}
              conditions match, recommend{" "}
              <strong className="text-[var(--ua-text-primary)]">
                {ACTION_LABELS[display.action]}
              </strong>
              . Recommendations never execute a payout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leadingIcon={<FlaskConical className="h-4 w-4" />}
              onClick={() => {
                setSignals(sampleValuesFor(simulationConditions));
                setSimulation(null);
                setSimulationOpen(true);
              }}
            >
              Simulate
            </Button>
            {canManage ? (
              <Button
                variant="secondary"
                leadingIcon={<Pencil className="h-4 w-4" />}
                onClick={() => setEditing(true)}
              >
                {draft ? "Edit draft" : "Create draft"}
              </Button>
            ) : null}
            {canManage && draft ? (
              <Button
                variant="primary"
                leadingIcon={<Send className="h-4 w-4" />}
                loading={busy === "preview"}
                onClick={previewPublish}
              >
                Review publish
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card unstyled
          as="section"
          variant="panel"
          className="p-4"
          aria-labelledby="rule-conditions-title"
        >
          <h2 id="rule-conditions-title" className="text-sm font-semibold">
            Readable policy
          </h2>
          <p className="mt-1 text-xs text-[var(--ua-text-tertiary)]">
            Required fields are checked before the first-match recommendation
            runs.
          </p>
          <ol className="mt-4 space-y-2">
            {display.conditions.map((condition, index) => (
              <li
                key={condition.id ?? `${condition.field}-${index}`}
                className="grid gap-1 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-3 py-2.5 sm:grid-cols-[2rem_1fr]"
              >
                <span className="font-mono text-xs text-[var(--ua-text-tertiary)]">
                  {index + 1}
                </span>
                <span className="text-sm">{readableCondition(condition)}</span>
              </li>
            ))}
          </ol>
          {display.conditions.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ua-warning)]">
              No conditions: this rule would match every evaluated case.
            </p>
          ) : null}
        </Card>

        <Card unstyled
          as="section"
          variant="panel"
          className="p-4"
          aria-labelledby="draft-diff-title"
        >
          <h2 id="draft-diff-title" className="text-sm font-semibold">
            Draft impact
          </h2>
          {!draft ? (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              No draft. Published v{published?.version ?? "—"} is the only
              active configuration.
            </p>
          ) : !published ? (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              This is the first version. Simulate it, then review the publish
              confirmation.
            </p>
          ) : changes.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              Draft and published configuration are identical.
            </p>
          ) : (
            <dl className="mt-3 space-y-3">
              {changes.map(([label, before, after]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-[var(--ua-text-tertiary)]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xs">
                    <span className="line-through text-[var(--ua-text-tertiary)]">
                      {before}
                    </span>
                    <span className="mx-1 text-[var(--ua-text-tertiary)]">to</span>
                    <strong>{after}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {canManage && draft ? (
            <Button
              className="mt-4"
              variant="ghost"
              size="sm"
              onClick={discardDraft}
              loading={busy === "discard"}
            >
              Discard draft
            </Button>
          ) : null}
        </Card>
      </div>

      <Card unstyled
        as="section"
        variant="panel"
        className="overflow-hidden p-0"
        aria-labelledby="version-history-title"
      >
        <div className="flex items-center gap-2 border-b border-[var(--ua-border-subtle)] px-4 py-3">
          <History className="h-4 w-4" />
          <h2 id="version-history-title" className="text-sm font-semibold">
            Immutable version history
          </h2>
        </div>
        <div className="divide-y divide-[var(--ua-border-subtle)]">
          {versions.map((version) => (
            <div
              key={version.id}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[7rem_8rem_1fr_auto] sm:items-center"
            >
              <strong className="font-sans text-sm tabular-nums">
                Version {version.version}
              </strong>
              <StatusBadge
                family="workflowStatus"
                value={version.status}
                size="sm"
                className="justify-self-start"
              />
              <span className="text-xs text-[var(--ua-text-secondary)]">
                {version.published_at
                  ? `Published ${formatDateTime(version.published_at)}`
                  : `Created ${formatDateTime(version.created_at)}`}
                {version.supersedes_version_id ? " · rollback-derived" : ""}
              </span>
              {canManage && version.status !== "draft" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  disabled={Boolean(draft)}
                  loading={busy === `rollback-${version.version}`}
                  onClick={() => rollback(version.version)}
                >
                  Use as new draft
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <RuleBuilderDrawer
        key={`${draft?.id ?? "new"}-${editing}`}
        open={editing}
        mode={draft ? "edit" : "create"}
        initialRule={
          draft
            ? asRule(ruleId, draft)
            : published
              ? asRule(ruleId, published)
              : null
        }
        onClose={() => setEditing(false)}
        onSubmit={saveDraft}
      />

      <Modal
        open={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Simulate rule"
        description="Try this rule on a sample case. Nothing changes until you publish."
        actions={[
          {
            label: busy === "simulate" ? "Testing…" : "Run simulation",
            onClick: simulate,
          },
        ]}
      >
        {simulationConditions.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {simulationConditions.map((condition) => {
              const def = FIELD_DEFS_BY_NAME[condition.field];
              const label =
                FIELD_LABELS[condition.field] ??
                condition.field.replaceAll("_", " ");
              const value = signals[condition.field] ?? UNAVAILABLE;
              if (def?.type === "boolean")
                return (
                  <label key={condition.field} className="text-xs font-medium">
                    {label}
                    <select
                      value={value}
                      onChange={(event) =>
                        setSignals((current) => ({
                          ...current,
                          [condition.field]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 text-sm"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                      <option value={UNAVAILABLE}>Unavailable</option>
                    </select>
                  </label>
                );
              if (def?.type === "enum")
                return (
                  <label key={condition.field} className="text-xs font-medium">
                    {label}
                    <select
                      value={value}
                      onChange={(event) =>
                        setSignals((current) => ({
                          ...current,
                          [condition.field]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 text-sm"
                    >
                      {def.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      <option value={UNAVAILABLE}>Unavailable</option>
                    </select>
                  </label>
                );
              return (
                <label key={condition.field} className="text-xs font-medium">
                  {label}
                  <input
                    type={
                      def?.type === "integer" || def?.type === "decimal"
                        ? "number"
                        : "text"
                    }
                    value={value === UNAVAILABLE ? "" : value}
                    placeholder={
                      def?.type === "string_array"
                        ? "Comma-separated values"
                        : undefined
                    }
                    onChange={(event) =>
                      setSignals((current) => ({
                        ...current,
                        [condition.field]: event.target.value || UNAVAILABLE,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    Clear the field to simulate unavailable source data.
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--ua-warning)]">
            This rule has no conditions and therefore matches every evaluated
            case.
          </p>
        )}
        {simulation ? (
          <div className="mt-4 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
            <div className="flex items-center gap-2">
              {simulation.simulation.matched ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--ua-success)]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[var(--ua-warning)]" />
              )}
              <strong className="text-sm">
                {simulation.simulation.matched
                  ? `Matched: ${ACTION_LABELS[simulation.simulation.recommendedAction as keyof typeof ACTION_LABELS] ?? simulation.simulation.recommendedAction}`
                  : "Did not match"}
              </strong>
            </div>
            <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
              Tested version {simulation.version} ·{" "}
              {simulation.simulation.writesPerformed} writes performed
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(publishPreview)}
        onClose={() => setPublishPreview(null)}
        title="Publish rule version"
        description="Publication is atomic. The existing version remains active if any step fails."
        actions={[
          {
            label:
              busy === "publish"
                ? "Publishing…"
                : `Publish v${publishPreview?.version ?? ""}`,
            onClick: confirmPublish,
            variant: publishPreview?.conflicts.length ? "danger" : "primary",
          },
        ]}
      >
        {publishPreview ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Required data:</strong>{" "}
              {publishPreview.dataRequirements.join(", ") || "None"}
            </p>
            {publishPreview.conflicts.length > 0 ? (
              <div className="rounded-md border border-[var(--ua-warning)] bg-[var(--ua-warning-bg)] p-3">
                <p className="font-semibold">
                  {publishPreview.conflicts.length} conflict
                  {publishPreview.conflicts.length === 1 ? "" : "s"} require
                  explicit acceptance
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {publishPreview.conflicts.map((conflict) => (
                    <li key={conflict.ruleId}>
                      {conflict.name}: {conflict.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-[var(--ua-success)]">
                <CheckCircle2 className="h-4 w-4" /> No same-priority condition
                conflicts detected.
              </p>
            )}
            <p className="text-xs text-[var(--ua-text-secondary)]">
              Only future evaluations use this version. Historical decisions
              retain their original rule evidence.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
