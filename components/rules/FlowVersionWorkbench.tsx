"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  FlaskConical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Modal,
  Card,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  FlowEditor,
  type FlowDraftPayload,
  type FlowEditable,
  type FlowConditionDraft,
  type FlowOutputDraft,
} from "@/components/rules/FlowEditor";
import { formatDateTime } from "@/lib/utils/format";
import { FIELD_DEFS_BY_NAME, FIELD_LABELS } from "@/lib/rules/fields";

export type WorkflowVersionRecord = FlowEditable & {
  id: string;
  version: number;
  status: "draft" | "published" | "retired";
  active: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const parts = path.split(".");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const existing = cursor[part];
    cursor[part] = existing && typeof existing === "object" ? existing : {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1)!] = value;
}

function actionSummary(output: FlowOutputDraft) {
  if (output.type === "create_task")
    return `Create ${output.priority ?? "medium"} task “${output.title}”${output.dueInHours ? ` due in ${output.dueInHours}h` : ""}`;
  if (output.type === "request_evidence")
    return `Request ${output.evidenceType.replaceAll("_", " ")}`;
  if (output.type === "set_deadline")
    return `Set deadline to ${output.dueInHours}h`;
  return `Request ${output.kind.replaceAll("_", " ")} notification “${output.title}”`;
}

const OPERATOR_COPY: Record<FlowConditionDraft["operator"], string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  exists: "is present",
};

function readableCondition(condition: FlowConditionDraft): string {
  const field = FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ");
  const definition = FIELD_DEFS_BY_NAME[condition.field];
  const values = (Array.isArray(condition.value) ? condition.value : [condition.value])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => definition?.options?.find((option) => option.value === value)?.label ?? String(value).replaceAll("_", " "));
  return condition.operator === "exists"
    ? `${field} ${OPERATOR_COPY[condition.operator]}`
    : `${field} ${OPERATOR_COPY[condition.operator]} ${values.join(", ")}`;
}

function withOccurrenceKeys<T>(items: T[], serialize: (item: T) => string) {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const serialized = serialize(item);
    const occurrence = (seen.get(serialized) ?? 0) + 1;
    seen.set(serialized, occurrence);
    return { item, key: `${serialized}-${occurrence}` };
  });
}

export function FlowVersionWorkbench({
  versions,
  currentId,
  canManage,
  publicationEnabled,
}: {
  versions: WorkflowVersionRecord[];
  currentId: string;
  canManage: boolean;
  publicationEnabled: boolean;
}) {
  const router = useRouter();
  const current =
    versions.find((version) => version.id === currentId) ?? versions[0]!;
  const draft = versions.find((version) => version.status === "draft") ?? null;
  const published =
    versions.find((version) => version.status === "published") ?? null;
  const display = draft ?? published ?? current;
  const [editing, setEditing] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [publishPreview, setPublishPreview] = useState<{
    summary: { trigger: string; conditionCount: number; actions: string[] };
    notice: string;
    publicationEnabled: boolean;
  } | null>(null);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      display.conditions.map((condition) => [
        condition.field,
        condition.operator === "exists"
          ? "sample"
          : String(
              Array.isArray(condition.value)
                ? (condition.value[0] ?? "")
                : (condition.value ?? ""),
            ),
      ]),
    ),
  );
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    plannedActions: FlowOutputDraft[];
    writesPerformed: number;
    notice: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const changes = useMemo(() => {
    if (!draft || !published) return [];
    return [
      ["Trigger", published.trigger_event_type, draft.trigger_event_type],
      [
        "Conditions",
        `${published.conditions.length}`,
        `${draft.conditions.length}`,
      ],
      [
        "Actions",
        published.outputs.map(actionSummary).join("; "),
        draft.outputs.map(actionSummary).join("; "),
      ],
      [
        "Description",
        published.description ?? "None",
        draft.description ?? "None",
      ],
    ].filter(([, before, after]) => before !== after);
  }, [draft, published]);

  async function save(payload: FlowDraftPayload) {
    setBusy("save");
    setMessage(null);
    try {
      const target = draft?.id ?? published?.id ?? current.id;
      const response = await fetch(`/api/workflows/${target}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Flow draft could not be saved");
      setEditing(false);
      router.push(`/flows/${body.workflow.id}`);
      router.refresh();
      setMessage({ tone: "success", text: body.notice });
      return true;
    } catch (reason) {
      setMessage({
        tone: "error",
        text:
          reason instanceof Error
            ? reason.message
            : "Flow draft could not be saved",
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function testFlow() {
    setBusy("test");
    setTestResult(null);
    setMessage(null);
    const payload: Record<string, unknown> = {};
    for (const condition of display.conditions) {
      const raw = sampleValues[condition.field] ?? "";
      const reference = Array.isArray(condition.value)
        ? condition.value[0]
        : condition.value;
      const value =
        typeof reference === "number"
          ? Number(raw)
          : typeof reference === "boolean"
            ? raw === "true"
            : raw;
      setPath(payload, condition.field, value);
    }
    try {
      const response = await fetch(`/api/workflows/${display.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Test run failed");
      setTestResult(body);
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "Test run failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function previewPublish() {
    if (!draft) return;
    setBusy("preview");
    try {
      const response = await fetch(`/api/workflows/${draft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish preview failed");
      setPublishPreview(body);
    } catch (reason) {
      setMessage({
        tone: "error",
        text:
          reason instanceof Error ? reason.message : "Publish preview failed",
      });
    } finally {
      setBusy(null);
    }
  }
  async function publish() {
    if (!draft) return;
    setBusy("publish");
    try {
      const response = await fetch(`/api/workflows/${draft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publish failed");
      setPublishPreview(null);
      router.push(`/flows/${body.workflow.id}`);
      router.refresh();
      setMessage({
        tone: "success",
        text: `Version ${body.workflow.version} published atomically.`,
      });
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "Publish failed",
      });
    } finally {
      setBusy(null);
    }
  }
  async function changeState(action: "pause" | "resume") {
    if (!published) return;
    setBusy(action);
    try {
      const response = await fetch(`/api/workflows/${published.id}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "State update failed");
      router.refresh();
      setMessage({ tone: "success", text: body.notice });
    } catch (reason) {
      setMessage({
        tone: "error",
        text: reason instanceof Error ? reason.message : "State update failed",
      });
    } finally {
      setBusy(null);
    }
  }
  async function rollback(sourceId: string, version: number) {
    setBusy(`rollback-${version}`);
    try {
      const response = await fetch(`/api/workflows/${sourceId}/rollback`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Rollback draft failed");
      router.push(`/flows/${body.workflow.id}`);
      router.refresh();
      setMessage({ tone: "success", text: body.notice });
    } catch (reason) {
      setMessage({
        tone: "error",
        text:
          reason instanceof Error ? reason.message : "Rollback draft failed",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor:
              message.tone === "error" ? "var(--ua-critical)" : "var(--ua-success)",
            color:
              message.tone === "error"
                ? "var(--ua-critical)"
                : "var(--ua-text-primary)",
          }}
        >
          {message.text}
        </p>
      ) : null}
      {!publicationEnabled ? (
        <p
          role="status"
          className="rounded-md border border-[var(--ua-warning)] bg-[var(--ua-surface-muted)] px-3 py-2 text-sm text-[var(--ua-text-primary)]"
        >
          <strong>Preview:</strong> drafts and dry-run tests are available, but
          publication, activation, and live execution stay disabled until the
          replay and idempotency release gate passes.
        </p>
      ) : null}
      <Card unstyled variant="panel" className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge family="workflowStatus" value={display.status === "published" && !display.active ? "paused" : display.status} />
              <span className="font-sans text-xs tabular-nums text-[var(--ua-text-tertiary)]">
                v{display.version}
              </span>
              {draft && published ? (
                <span className="text-xs text-[var(--ua-text-secondary)]">
                  Published v{published.version} remains{" "}
                  {published.active ? "active" : "paused"}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--ua-text-secondary)]">
              Trigger{" "}
              <strong className="font-mono text-[var(--ua-text-primary)]">
                {display.trigger_event_type}
              </strong>{" "}
              · {display.conditions.length} condition
              {display.conditions.length === 1 ? "" : "s"} ·{" "}
              {display.outputs.length} bounded action
              {display.outputs.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leadingIcon={<FlaskConical className="h-4 w-4" />}
              onClick={() => setTestOpen(true)}
            >
              Test event
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
                {publicationEnabled ? "Review publish" : "Review preview"}
              </Button>
            ) : null}
            {canManage && published ? (
              <Button
                variant="ghost"
                leadingIcon={
                  published.active ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )
                }
                loading={busy === (published.active ? "pause" : "resume")}
                disabled={!published.active && !publicationEnabled}
                onClick={() =>
                  changeState(published.active ? "pause" : "resume")
                }
              >
                {published.active ? "Pause" : "Resume"}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card unstyled as="section" variant="panel" className="p-4">
          <h2 className="text-sm font-semibold">Structured flow</h2>
          <ol className="mt-4 space-y-3">
            <li className="rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
              <strong className="text-sm">1. Trigger</strong>
              <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
                {display.trigger_event_type.replaceAll("_", " ")}
              </p>
            </li>
            <li className="rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
              <strong className="text-sm">2. Match all conditions</strong>
              {display.conditions.length ? (
                <ul className="mt-2 space-y-1 text-xs text-[var(--ua-text-secondary)]">
                  {withOccurrenceKeys(
                    display.conditions,
                    (condition) =>
                      `${condition.field}:${condition.operator}:${JSON.stringify(condition.value)}`,
                  ).map(({ item: condition, key }) => (
                    <li key={key}>{readableCondition(condition)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--ua-warning)]">
                  No conditions — every trigger event matches.
                </p>
              )}
            </li>
            {withOccurrenceKeys(display.outputs, (output) =>
              JSON.stringify(output),
            ).map(({ item: output, key }, index) => (
              <li
                key={key}
                className="rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3"
              >
                <strong className="text-sm">
                  {index + 3}. {actionSummary(output)}
                </strong>
              </li>
            ))}
          </ol>
        </Card>
        <Card unstyled as="section" variant="panel" className="p-4">
          <h2 className="text-sm font-semibold">Draft impact</h2>
          {!draft ? (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              No draft. Published v{published?.version ?? "—"} is the configured
              definition.
            </p>
          ) : !published ? (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              First version: test it before publication.
            </p>
          ) : changes.length ? (
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
          ) : (
            <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">
              Draft and published definitions are identical.
            </p>
          )}
        </Card>
      </div>
      <Card unstyled as="section" variant="panel" className="overflow-hidden p-0">
        <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
          <h2 className="text-sm font-semibold">
            Version history and rollback
          </h2>
        </div>
        <div className="divide-y divide-[var(--ua-border-subtle)]">
          {versions.map((version) => (
            <div
              key={version.id}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[7rem_8rem_1fr_auto] sm:items-center"
            >
              <strong className="font-mono text-sm">
                Version {version.version}
              </strong>
              <StatusBadge family="workflowStatus" value={version.status === "published" && !version.active ? "paused" : version.status} size="sm" />
              <span className="text-xs text-[var(--ua-text-secondary)]">
                {version.published_at
                  ? `Published ${formatDateTime(version.published_at)}`
                  : `Created ${formatDateTime(version.created_at)}`}
              </span>
              {canManage && version.status !== "draft" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  disabled={Boolean(draft)}
                  loading={busy === `rollback-${version.version}`}
                  onClick={() => rollback(version.id, version.version)}
                >
                  Use as new draft
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={draft ? "Edit flow draft" : "Create flow draft"}
        description="Only the draft changes. The published version remains untouched."
      >
        <div className="max-h-[75vh] overflow-y-auto">
          <FlowEditor
            initial={display}
            fixedName
            submitLabel={draft ? "Save draft" : "Create draft version"}
            onCancel={() => setEditing(false)}
            onSubmit={save}
          />
        </div>
      </Modal>
      <Modal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        title="Test event"
        description="Try this flow with sample values. Nothing changes until you publish."
        actions={[
          {
            label: busy === "test" ? "Testing…" : "Run test",
            onClick: testFlow,
          },
        ]}
      >
        {display.conditions.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {display.conditions.map((condition) => (
              <label
                key={condition.field}
                className="text-xs font-semibold text-[var(--ua-text-secondary)]"
              >
                <span>{FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ")}</span>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 text-sm"
                  value={sampleValues[condition.field] ?? ""}
                  onChange={(event) =>
                    setSampleValues((currentValues) => ({
                      ...currentValues,
                      [condition.field]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ua-warning)]">
            This flow has no conditions, so every event with the configured
            trigger will match.
          </p>
        )}
        {testResult ? (
          <div className="mt-4 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-[var(--ua-success)]" />
              {testResult.matched ? "Event matched" : "Event did not match"}
            </p>
            <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
              {testResult.matched
                ? `${testResult.plannedActions.length} actions planned`
                : "No actions planned"}{" "}
              · {testResult.writesPerformed} writes performed
            </p>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(publishPreview)}
        onClose={() => setPublishPreview(null)}
        title={publicationEnabled ? "Publish flow version" : "Flow publication preview"}
        description={
          publicationEnabled
            ? "Atomic publication retires the previous version only if the new version activates successfully."
            : "This is a read-only preview. Publication and live execution are disabled by the release gate."
        }
        actions={
          publicationEnabled
            ? [
                {
                  label:
                    busy === "publish"
                      ? "Publishing…"
                      : `Publish v${draft?.version ?? ""}`,
                  onClick: publish,
                },
              ]
            : []
        }
      >
        {publishPreview ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Trigger:</strong>{" "}
              <span className="font-mono">
                {publishPreview.summary.trigger}
              </span>
            </p>
            <p>
              <strong>Conditions:</strong>{" "}
              {publishPreview.summary.conditionCount}
            </p>
            <p>
              <strong>Actions:</strong>{" "}
              {publishPreview.summary.actions
                .map((action) => action.replaceAll("_", " "))
                .join(", ")}
            </p>
            <p className="text-xs text-[var(--ua-text-secondary)]">
              {publishPreview.notice}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
