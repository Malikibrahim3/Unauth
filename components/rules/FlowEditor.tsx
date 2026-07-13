"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, PanelCard } from "@/components/ui";

export type FlowConditionDraft = {
  field: string;
  operator: "eq" | "neq" | "in" | "exists";
  value?: unknown;
  _editorKey?: string;
};
export type FlowOutputDraft = (
  | {
      type: "create_task";
      title: string;
      priority: "low" | "medium" | "high" | "urgent";
      dueInHours?: number;
    }
  | { type: "request_evidence"; evidenceType: string; title?: string }
  | { type: "set_deadline"; dueInHours: number }
  | {
      type: "request_notification";
      recipientUserId: string;
      kind:
        | "assignment"
        | "mention"
        | "approaching_deadline"
        | "evidence_update"
        | "decision_request"
        | "recovery_outcome"
        | "sync_failure"
        | "daily_work_summary"
        | "high_value_case_alert"
        | "scheduled_report";
      title: string;
      body?: string;
    }
) & { _editorKey?: string };

export type FlowDraftPayload = {
  name: string;
  description?: string;
  triggerEventType: string;
  conditions: FlowConditionDraft[];
  outputs: FlowOutputDraft[];
  active: boolean;
};

export type FlowEditable = {
  name: string;
  description: string | null;
  trigger_event_type: string;
  conditions: FlowConditionDraft[];
  outputs: FlowOutputDraft[];
};

const TRIGGERS = [
  ["case.created", "Payout case created"],
  ["case.updated", "Payout case updated"],
  ["case.decision_recorded", "Decision recorded"],
  ["shipment.exception_recorded", "Shipment exception recorded"],
  ["connection.sync_failed", "Integration sync failed"],
] as const;

let editorKeySequence = 0;
function nextEditorKey(prefix: string) {
  editorKeySequence += 1;
  return `${prefix}-${editorKeySequence}`;
}

function blankOutput(): FlowOutputDraft {
  return {
    type: "create_task",
    title: "Review payout case",
    priority: "medium",
    dueInHours: 24,
    _editorKey: nextEditorKey("action"),
  };
}

function outputLabel(output: FlowOutputDraft) {
  if (output.type === "create_task")
    return `Create task · ${output.title || "Untitled"}`;
  if (output.type === "request_evidence")
    return `Request evidence · ${output.evidenceType || "Choose type"}`;
  if (output.type === "set_deadline")
    return `Set deadline · ${output.dueInHours || "—"} hours`;
  return `Notify team member · ${output.title || "Untitled"}`;
}

export function FlowEditor({
  initial,
  fixedName = false,
  submitLabel = "Save draft",
  onSubmit,
  onCancel,
}: {
  initial?: FlowEditable | null;
  fixedName?: boolean;
  submitLabel?: string;
  onSubmit: (payload: FlowDraftPayload) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState(
    initial?.trigger_event_type ?? "case.created",
  );
  const [conditions, setConditions] = useState<FlowConditionDraft[]>(() =>
    (initial?.conditions ?? []).map((condition) => ({
      ...condition,
      _editorKey: condition._editorKey ?? nextEditorKey("condition"),
    })),
  );
  const [outputs, setOutputs] = useState<FlowOutputDraft[]>(() =>
    initial?.outputs?.length
      ? initial.outputs.map((output) => ({
          ...output,
          _editorKey: output._editorKey ?? nextEditorKey("action"),
        }))
      : [blankOutput()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(
    () => [
      TRIGGERS.find(([value]) => value === trigger)?.[1] ?? trigger,
      conditions.length
        ? `${conditions.length} condition${conditions.length === 1 ? "" : "s"}`
        : "No conditions (every event matches)",
      `${outputs.length} action${outputs.length === 1 ? "" : "s"}`,
    ],
    [conditions.length, outputs.length, trigger],
  );

  function updateOutput(index: number, output: FlowOutputDraft) {
    setOutputs((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? output : item)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Flow name is required.");
    if (outputs.length === 0)
      return setError("Add at least one bounded action.");
    if (conditions.some((condition) => !condition.field.trim()))
      return setError("Every condition needs a field.");
    setSaving(true);
    const ok = await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      triggerEventType: trigger,
      conditions: conditions.map(
        ({ _editorKey: _key, ...condition }) => condition,
      ),
      outputs: outputs.map(({ _editorKey: _key, ...output }) => output),
      active: false,
    });
    setSaving(false);
    if (!ok)
      setError(
        "Draft could not be saved. Check the highlighted configuration and try again.",
      );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PanelCard variant="app" className="p-4">
        <h2 className="text-sm font-semibold">Flow identity and trigger</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Flow name
            <Input
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={fixedName}
              placeholder="e.g. Chase carrier evidence"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Trigger
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
            >
              {TRIGGERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-xs font-semibold text-[var(--text-secondary)]">
          Operator-facing description
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What work does this route, and why?"
          />
        </label>
      </PanelCard>

      <PanelCard variant="app" className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Conditions</h2>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              All conditions must match. Use source event fields such as
              case.status or shipment.carrier.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() =>
              setConditions((current) => [
                ...current,
                {
                  field: "case.status",
                  operator: "eq",
                  value: "evidence_needed",
                  _editorKey: nextEditorKey("condition"),
                },
              ])
            }
          >
            Add condition
          </Button>
        </div>
        {conditions.length ? (
          <div className="mt-3 space-y-2">
            {conditions.map((condition, index) => (
              <div
                key={condition._editorKey}
                className="grid gap-2 rounded-md border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto]"
              >
                <Input
                  aria-label={`Condition ${index + 1} field`}
                  value={condition.field}
                  onChange={(event) =>
                    setConditions((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, field: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="case.status"
                />
                <select
                  aria-label={`Condition ${index + 1} operator`}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={condition.operator}
                  onChange={(event) =>
                    setConditions((current) =>
                      current.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              operator: event.target
                                .value as FlowConditionDraft["operator"],
                            }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="eq">equals</option>
                  <option value="neq">does not equal</option>
                  <option value="in">is one of</option>
                  <option value="exists">is present</option>
                </select>
                {condition.operator !== "exists" ? (
                  <Input
                    aria-label={`Condition ${index + 1} value`}
                    value={
                      Array.isArray(condition.value)
                        ? condition.value.join(", ")
                        : String(condition.value ?? "")
                    }
                    onChange={(event) =>
                      setConditions((current) =>
                        current.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                value:
                                  condition.operator === "in"
                                    ? event.target.value
                                        .split(",")
                                        .map((value) => value.trim())
                                        .filter(Boolean)
                                    : event.target.value,
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder={
                      condition.operator === "in"
                        ? "value one, value two"
                        : "Expected value"
                    }
                  />
                ) : (
                  <span className="self-center text-xs text-[var(--text-tertiary)]">
                    No comparison value
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove condition ${index + 1}`}
                  onClick={() =>
                    setConditions((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-[var(--warning)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning)]">
            No conditions: every event with this trigger will run the actions
            below.
          </p>
        )}
      </PanelCard>

      <PanelCard variant="app" className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Bounded actions</h2>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Flows can route work, request evidence, set deadlines, or request
              a notification. They cannot make or execute payout decisions.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setOutputs((current) => [...current, blankOutput()])}
          >
            Add action
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {outputs.map((output, index) => (
            <ActionEditor
              key={output._editorKey}
              index={index}
              output={output}
              update={(next) => updateOutput(index, next)}
              remove={() =>
                setOutputs((current) => current.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>
      </PanelCard>

      <PanelCard variant="appInset" className="p-4">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">
          Readable summary
        </p>
        <ol className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          {summary.map((item, index) => (
            <li
              key={item}
              className="rounded-md border border-[var(--border-muted)] bg-[var(--surface)] px-3 py-2"
            >
              <span className="mr-2 font-mono text-xs text-[var(--text-tertiary)]">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
        <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
          {outputs.map((output, index) => (
            <li key={output._editorKey}>
              Action {index + 1}: {outputLabel(output)}
            </li>
          ))}
        </ul>
      </PanelCard>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ActionEditor({
  index,
  output,
  update,
  remove,
}: {
  index: number;
  output: FlowOutputDraft;
  update: (output: FlowOutputDraft) => void;
  remove: () => void;
}) {
  function changeType(type: FlowOutputDraft["type"]) {
    if (type === "create_task")
      update({ ...blankOutput(), _editorKey: output._editorKey });
    else if (type === "request_evidence")
      update({
        type,
        evidenceType: "proof_of_delivery",
        title: "Collect proof of delivery",
        _editorKey: output._editorKey,
      });
    else if (type === "set_deadline")
      update({ type, dueInHours: 24, _editorKey: output._editorKey });
    else
      update({
        type,
        recipientUserId: "",
        kind: "assignment",
        title: "Flow needs attention",
        body: "",
        _editorKey: output._editorKey,
      });
  }
  return (
    <div className="rounded-md border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">
          Action {index + 1}
          <select
            className="ml-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
            value={output.type}
            onChange={(event) =>
              changeType(event.target.value as FlowOutputDraft["type"])
            }
          >
            <option value="create_task">Create task</option>
            <option value="request_evidence">Request evidence</option>
            <option value="set_deadline">Set deadline</option>
            <option value="request_notification">Notify team member</option>
          </select>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove action ${index + 1}`}
          onClick={remove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {output.type === "create_task" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_8rem]">
          <Input
            aria-label={`Action ${index + 1} task title`}
            value={output.title}
            onChange={(event) =>
              update({ ...output, title: event.target.value })
            }
            placeholder="Task title"
          />
          <select
            aria-label={`Action ${index + 1} priority`}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            value={output.priority}
            onChange={(event) =>
              update({
                ...output,
                priority: event.target.value as typeof output.priority,
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <Input
            aria-label={`Action ${index + 1} due hours`}
            type="number"
            min={1}
            max={8760}
            value={output.dueInHours ?? ""}
            onChange={(event) =>
              update({
                ...output,
                dueInHours: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            placeholder="Due hours"
          />
        </div>
      ) : output.type === "request_evidence" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            aria-label={`Action ${index + 1} evidence type`}
            value={output.evidenceType}
            onChange={(event) =>
              update({ ...output, evidenceType: event.target.value })
            }
            placeholder="proof_of_delivery"
          />
          <Input
            aria-label={`Action ${index + 1} title`}
            value={output.title ?? ""}
            onChange={(event) =>
              update({ ...output, title: event.target.value })
            }
            placeholder="Request title"
          />
        </div>
      ) : output.type === "set_deadline" ? (
        <Input
          className="mt-3 max-w-xs"
          aria-label={`Action ${index + 1} deadline hours`}
          type="number"
          min={1}
          max={8760}
          value={output.dueInHours}
          onChange={(event) =>
            update({ ...output, dueInHours: Number(event.target.value) })
          }
        />
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            aria-label={`Action ${index + 1} recipient user ID`}
            value={output.recipientUserId}
            onChange={(event) =>
              update({ ...output, recipientUserId: event.target.value })
            }
            placeholder="Team member UUID"
          />
          <select
            aria-label={`Action ${index + 1} notification kind`}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            value={output.kind}
            onChange={(event) =>
              update({
                ...output,
                kind: event.target.value as typeof output.kind,
              })
            }
          >
            <option value="assignment">Assignment</option>
            <option value="approaching_deadline">Approaching deadline</option>
            <option value="evidence_update">Evidence update</option>
            <option value="decision_request">Decision request</option>
            <option value="recovery_outcome">Recovery outcome</option>
            <option value="sync_failure">Sync failure</option>
          </select>
          <Input
            aria-label={`Action ${index + 1} notification title`}
            value={output.title}
            onChange={(event) =>
              update({ ...output, title: event.target.value })
            }
            placeholder="Notification title"
          />
          <Input
            aria-label={`Action ${index + 1} notification body`}
            value={output.body ?? ""}
            onChange={(event) =>
              update({ ...output, body: event.target.value })
            }
            placeholder="Optional message"
          />
        </div>
      )}
    </div>
  );
}
