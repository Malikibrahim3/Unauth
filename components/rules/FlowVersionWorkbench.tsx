"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui";
import {
  FlowEditor,
  type FlowConditionDraft,
  type FlowDraftPayload,
  type FlowEditable,
  type FlowOutputDraft,
} from "@/components/rules/FlowEditor";
import { FIELD_DEFS_BY_NAME, FIELD_LABELS } from "@/lib/rules/fields";
import { formatDateTime } from "@/lib/utils/format";
import styles from "./FlowBuilderOperations.module.css";

export type WorkflowVersionRecord = FlowEditable & {
  id: string;
  version: number;
  status: "draft" | "published" | "retired";
  active: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type BuilderStep = {
  id: string;
  kind: "Trigger" | "Automated" | "Decision";
  automatic: boolean;
  icon: string;
  label: string;
  detail: string;
  stat: string;
  settings: Array<{ label: string; value: string }>;
  warning?: { title: string; body: string };
};

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
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
  if (output.type === "create_task") return `Create ${output.priority ?? "medium"} task “${output.title || "Untitled"}”${output.dueInHours ? ` due in ${output.dueInHours}h` : ""}`;
  if (output.type === "request_evidence") return `Request ${(output.evidenceType || "evidence").replaceAll("_", " ")}`;
  if (output.type === "set_deadline") return `Set deadline to ${output.dueInHours}h`;
  if (output.type === "request_notification") return `Request ${(output.kind || "team").replaceAll("_", " ")} notification “${output.title || "Untitled"}”`;
  return "Review workflow action";
}

const OPERATOR_COPY: Record<FlowConditionDraft["operator"], string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  exists: "is present",
};

function readableCondition(condition: FlowConditionDraft) {
  const field = FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ");
  const definition = FIELD_DEFS_BY_NAME[condition.field];
  const values = (Array.isArray(condition.value) ? condition.value : [condition.value])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => definition?.options?.find((option) => option.value === value)?.label ?? String(value).replaceAll("_", " "));
  return condition.operator === "exists"
    ? `${field} ${OPERATOR_COPY[condition.operator]}`
    : `${field} ${OPERATOR_COPY[condition.operator]} ${values.join(", ")}`;
}

function outputSettings(output: FlowOutputDraft) {
  if (output.type === "create_task") return [
    { label: "Action", value: "Create a work item" },
    { label: "Priority", value: output.priority },
    { label: "Due", value: output.dueInHours ? `${output.dueInHours} hours` : "No deadline" },
  ];
  if (output.type === "request_evidence") return [
    { label: "Action", value: "Request evidence" },
    { label: "Evidence type", value: output.evidenceType.replaceAll("_", " ") || "Unavailable" },
    { label: "On missing source", value: "Continue and mark unavailable" },
  ];
  if (output.type === "set_deadline") return [
    { label: "Action", value: "Set deadline" },
    { label: "Due", value: `${output.dueInHours} hours` },
    { label: "Authority", value: "Operational routing only" },
  ];
  return [
    { label: "Action", value: "Request notification" },
    { label: "Kind", value: output.kind.replaceAll("_", " ") },
    { label: "Recipient", value: output.recipientUserId ? "Named user recorded" : "Unavailable" },
  ];
}

function buildSteps(flow: WorkflowVersionRecord): BuilderStep[] {
  const conditionDetail = flow.conditions.length
    ? flow.conditions.slice(0, 2).map(readableCondition).join(" · ")
    : "No conditions — every event with this trigger matches";
  const steps: BuilderStep[] = [
    {
      id: "trigger",
      kind: "Trigger",
      automatic: true,
      icon: "⚡",
      label: `When ${flow.trigger_event_type.replaceAll("_", " ")}`,
      detail: flow.description || "A source-backed event starts this flow.",
      stat: "Source event",
      settings: [
        { label: "Source event", value: flow.trigger_event_type.replaceAll("_", " ") },
        { label: "Version", value: `v${flow.version} · ${flow.status}` },
        { label: "Execution", value: flow.active ? "Live" : "Inactive" },
      ],
    },
    {
      id: "conditions",
      kind: "Automated",
      automatic: true,
      icon: "⟳",
      label: flow.conditions.length ? `Check ${flow.conditions.length} recorded condition${flow.conditions.length === 1 ? "" : "s"}` : "Continue without a condition gate",
      detail: conditionDetail,
      stat: `${flow.conditions.length} condition${flow.conditions.length === 1 ? "" : "s"}`,
      settings: [
        { label: "Logic", value: flow.conditions.length > 1 ? "Every condition must match" : "Single condition" },
        { label: "Conditions", value: flow.conditions.length ? conditionDetail : "None recorded" },
        { label: "On missing source", value: "Unavailable does not become zero" },
      ],
      warning: flow.conditions.length ? undefined : {
        title: "No condition gate is recorded",
        body: "Every source event with this trigger would continue to the bounded actions.",
      },
    },
  ];

  flow.outputs.forEach((output, index) => {
    steps.push({
      id: `output-${index}`,
      kind: "Automated",
      automatic: true,
      icon: "⟳",
      label: actionSummary(output),
      detail: "A bounded operational action. It cannot approve, deny, refund or move money.",
      stat: "Configured",
      settings: outputSettings(output),
    });
  });

  steps.push({
    id: "decision",
    kind: "Decision",
    automatic: false,
    icon: "◆",
    label: "Person approves, replaces or denies",
    detail: "A merchant decision — the flow stops at the authority boundary until a named person records it.",
    stat: "Always required",
    settings: [
      { label: "Queue", value: "Work · needs action" },
      { label: "Assign to", value: "Named authorised operator" },
      { label: "Authority", value: "Merchant decision" },
    ],
    warning: {
      title: "This step can never be automated",
      body: "Approving, replacing or denying moves money. Unauth requires a named person on every one.",
    },
  });
  return steps;
}

export function FlowVersionWorkbench({
  versions,
  currentId,
  canManage,
}: {
  versions: WorkflowVersionRecord[];
  currentId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const current = versions.find((version) => version.id === currentId) ?? versions[0]!;
  const draft = versions.find((version) => version.status === "draft") ?? null;
  const published = versions.find((version) => version.status === "published") ?? null;
  const display = draft ?? published ?? current;
  const steps = useMemo(() => buildSteps(display), [display]);
  const [selectedStepId, setSelectedStepId] = useState("decision");
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0]!;
  const [editing, setEditing] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(() => Object.fromEntries(display.conditions.map((condition) => [condition.field, condition.operator === "exists" ? "sample" : String(Array.isArray(condition.value) ? (condition.value[0] ?? "") : (condition.value ?? ""))])));
  const [testResult, setTestResult] = useState<{ matched: boolean; plannedActions: FlowOutputDraft[]; writesPerformed: number; notice: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

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
      if (!response.ok) throw new Error(body.error ?? "Flow draft could not be saved");
      setEditing(false);
      router.push(`/controls/flows/${body.workflow.id}`);
      router.refresh();
      setMessage({ tone: "success", text: body.notice });
      return true;
    } catch (reason) {
      setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Flow draft could not be saved" });
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
      const reference = Array.isArray(condition.value) ? condition.value[0] : condition.value;
      const value = typeof reference === "number" ? Number(raw) : typeof reference === "boolean" ? raw === "true" : raw;
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
      setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Test run failed" });
    } finally {
      setBusy(null);
    }
  }

  function openTest() {
    setSampleValues(Object.fromEntries(display.conditions.map((condition) => [condition.field, condition.operator === "exists" ? "sample" : String(Array.isArray(condition.value) ? (condition.value[0] ?? "") : (condition.value ?? ""))])));
    setTestResult(null);
    setTestOpen(true);
  }

  return (
    <div className={styles.root} data-operations-surface="flow-builder">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.breadcrumb}>Unauth <span>›</span> Flows › {display.name}</p>
          <h1>Edit flow</h1>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryButton} href={`/controls/flows?selected=${display.id}`}>Discard changes</Link>
          <button type="button" className={styles.secondaryButton} disabled={!canManage} onClick={() => setEditing(true)}>Save draft</button>
        </div>
      </header>

      <main className={styles.main}>
        {message ? <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
        <section className={styles.canvas}>
          <header>
            <div><h2>{display.name} · {display.status}</h2><p>{steps.length} steps · 1 handoff to a person · updated {formatDateTime(display.updated_at)}</p></div>
            {draft ? <i>Draft changes</i> : <i>Historical published version · inactive</i>}
          </header>
          <div className={styles.steps}>
            {steps.map((step, index) => (
              <div key={step.id}>
                <button type="button" className={styles.step} data-selected={selectedStep.id === step.id} data-automatic={step.automatic} onClick={() => setSelectedStepId(step.id)}>
                  <span className={styles.stepIcon}>{step.icon}</span>
                  <span className={styles.stepBody}>
                    <span className={styles.stepKind}>{step.kind}</span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                  <span className={styles.stepStat}>{step.stat}</span>
                  <span className={styles.drag} aria-hidden="true" />
                </button>
                {index < steps.length - 1 ? (
                  <div className={styles.connector}><span aria-hidden="true">↓</span><button type="button" disabled={!canManage} onClick={() => setEditing(true)}>+ Insert step</button></div>
                ) : null}
              </div>
            ))}
          </div>
          <footer><i /><span>A flow may gather, draft, assign and notify. Approving, denying or writing off money always requires a named person.</span></footer>
        </section>

        <aside className={styles.rail}>
          <section className={styles.inspector}>
            <header><h2>{selectedStep.label}</h2><p>{selectedStep.kind} step</p></header>
            <div className={styles.settings}>
              {selectedStep.settings.map((setting) => <label key={setting.label}><span>{setting.label}</span><button type="button" disabled={!canManage} onClick={() => setEditing(true)}>{setting.value}<i>⌄</i></button></label>)}
            </div>
            {selectedStep.warning ? <div className={styles.warning}><strong><i />{selectedStep.warning.title}</strong><p>{selectedStep.warning.body}</p></div> : null}
            <footer><button type="button" disabled={!canManage} onClick={() => setEditing(true)}>Duplicate</button><button type="button" className={styles.removeButton} disabled={!canManage || selectedStep.id === "decision"} onClick={() => setEditing(true)}>Remove step</button></footer>
          </section>

          <section className={styles.dryRun}>
            <header><h2>Test run</h2><i>No real events</i></header>
            <div className={styles.dryFigures}>
              <div><span>Would run</span><b>{testResult ? (testResult.matched ? "1 event" : "0 events") : "— Unavailable"}</b></div>
              <div><span>Would hold</span><b>{testResult ? (testResult.matched ? "0 held" : "1 held") : "— Unavailable"}</b></div>
            </div>
            <div className={styles.dryState}>
              {testResult ? <><code>Sample event</code><span>{testResult.plannedActions.length} bounded action{testResult.plannedActions.length === 1 ? "" : "s"}</span><i data-tone={testResult.matched ? "ok" : "hold"}>{testResult.matched ? "Would run" : "Would hold"}</i></> : <p>Run a source-shaped sample event to inspect this version. Historical 30-day replay is unavailable.</p>}
            </div>
            <button type="button" onClick={openTest}>Run dry test</button>
          </section>

          <section className={styles.publishing} data-state-id="flow-pilot-boundary">
            <h2>Pilot boundary</h2>
            <ul>
              <li data-ok="true"><i>✓</i><span>Draft editing and sample-event testing perform no live write.</span></li>
              <li data-ok="true"><i>✓</i><span>Outputs are limited to tasks, evidence requests, deadlines, and in-app notification requests.</span></li>
              <li data-ok="false"><i>!</i><span>Publication and live execution are unavailable until dispatcher idempotency, replay, audit, and failure recovery are independently proved.</span></li>
            </ul>
          </section>
        </aside>
      </main>

      <Modal open={editing} onClose={() => setEditing(false)} title={draft ? "Edit flow draft" : "Create flow draft"} description="Only the draft changes. Any historical published version remains untouched and inactive." overlayId="flow-edit-and-test-modals">
        <FlowEditor initial={display} fixedName submitLabel={draft ? "Save draft" : "Create draft version"} onCancel={() => setEditing(false)} onSubmit={save} />
      </Modal>

      <Modal open={testOpen} onClose={() => setTestOpen(false)} title="Test event" description="Try this flow with sample values. No real event is created and no live write is performed." overlayId="flow-edit-and-test-modals" actions={[{ label: busy === "test" ? "Testing…" : "Run test", onClick: testFlow }]}>
        {display.conditions.length ? <div className="grid gap-3 sm:grid-cols-2">{display.conditions.map((condition, index) => <label key={`${condition.field}-${index}`} className="ua-text-label"><span>{FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ")}</span><input className="ua-text-body mt-1 w-full rounded-md border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-3 py-2" value={sampleValues[condition.field] ?? ""} onChange={(event) => setSampleValues((currentValues) => ({ ...currentValues, [condition.field]: event.target.value }))} /></label>)}</div> : <p className="ua-text-body text-[var(--uo-route-warning)]">This flow has no conditions, so every event with the configured trigger will match.</p>}
        {testResult ? <div className="mt-4 rounded-md border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-muted)] p-3"><p className="ua-text-working-title flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--uo-route-success)]" />{testResult.matched ? "Event matched" : "Event did not match"}</p><p className="ua-text-caption-role mt-1">{testResult.matched ? `${testResult.plannedActions.length} actions planned` : "No actions planned"} · {testResult.writesPerformed} writes performed</p></div> : null}
      </Modal>

    </div>
  );
}
