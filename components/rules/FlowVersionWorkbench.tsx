"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { useRouter } from "next/navigation";
import {
  FlowEditor,
  type FlowConditionDraft,
  type FlowDraftPayload,
  type FlowEditable,
  type FlowOutputDraft,
} from "@/components/rules/FlowEditor";
import { FIELD_DEFS_BY_NAME, FIELD_LABELS } from "@/lib/rules/fields";
import { formatDateTime } from "@/lib/utils/format";
import type { CSSProperties } from 'react';
const styles: Record<string, CSSProperties> = {
  root:{height:'100%',minHeight:0,display:'flex',flexDirection:'column'},pageHeader:{height:54,display:'flex',alignItems:'center',gap:14,padding:'0 22px',borderBottom:'1px solid #eae8e5'},breadcrumb:{margin:0,color:'#6f6a63',fontSize:11.5},headerActions:{marginLeft:'auto',display:'flex',gap:8},secondaryButton:{padding:'7px 10px',border:0,borderRadius:9,boxShadow:'inset 0 0 0 1px rgba(28,27,25,.13)',background:'#fff',color:'#40454a',fontSize:11.5,textDecoration:'none'},main:{flex:1,minHeight:0,display:'grid',gridTemplateColumns:'minmax(0,1fr) 330px',gap:14,padding:'16px 22px 20px',overflow:'hidden'},message:{gridColumn:'1/-1',margin:0,padding:'9px 11px',borderRadius:8,background:'#fff3e9',color:'#7a5310',fontSize:11.5},canvas:{minWidth:0,overflow:'auto',padding:16,borderRadius:12,background:'#f4f3f1'},steps:{display:'grid',gap:0,maxWidth:760,margin:'0 auto'},step:{width:'100%',display:'grid',gridTemplateColumns:'32px minmax(0,1fr) 80px 16px',gap:10,alignItems:'center',padding:'12px 14px',border:'1px solid #e4e3e0',borderRadius:10,background:'#fff',color:'#1c1f23',textAlign:'left'},stepIcon:{width:28,height:28,display:'grid',placeItems:'center',borderRadius:8,background:'#f2f0ed'},stepBody:{minWidth:0,display:'grid',gap:3},stepKind:{color:'#6f6a63',fontSize:9.5,textTransform:'uppercase'},stepStat:{color:'#6f6a63',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,textAlign:'right'},drag:{width:10,height:16,borderLeft:'2px dotted #a7abad'},connector:{height:36,display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'#6f6a63',fontSize:10.5},rail:{minHeight:0,overflow:'auto',display:'grid',alignContent:'start',gap:12},inspector:{overflow:'hidden',borderRadius:12,background:'#f4f3f1'},settings:{display:'grid',gap:8,padding:14},warning:{margin:14,padding:10,borderRadius:9,background:'#fff3e9',color:'#7a5310',fontSize:11},removeButton:{color:'#b0431a'},dryRun:{padding:14,borderRadius:12,background:'#f4f3f1'},dryFigures:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:10},dryState:{marginTop:10,padding:10,borderRadius:8,background:'#fff',fontSize:10.5},publishing:{padding:14,borderRadius:12,background:'#1c1f23',color:'#fff'},
};

function FlowOverlay({ title, description, onClose, footer, children, busy = false }: { title: string; description: string; onClose: () => void; footer?: ReactNode; children: ReactNode; busy?: boolean }) {
  const dismiss = () => { if (!busy) onClose(); };
  const overlay = useOverlayPresence({ open: true, onClose: dismiss, trapFocus: true, lockBodyScroll: true, closeOnEscape: !busy });
  return <OverlayPortal><div onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }} data-flow-overlay-backdrop="true" style={{ pointerEvents: 'auto', position: 'fixed', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}><section data-overlay-id="flow-edit-test-and-publication-modals" ref={overlay.containerRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} style={{ width: 720, maxWidth: '100%', maxHeight: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{title}</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{description}</div></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={dismiss} style={{ border: 0, padding: 2, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button></div><div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px' }}>{children}</div>{footer ? <div style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#ffffff' }}>{footer}</div> : null}</section></div></OverlayPortal>;
}

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
    <div style={styles.root} data-operations-surface="flow-builder">
      <header style={styles.pageHeader}>
        <div>
          <p style={styles.breadcrumb}>Unauth <span>›</span> Flows › {display.name}</p>
          <h1>Edit flow</h1>
        </div>
        <div style={styles.headerActions}>
          <Link style={styles.secondaryButton} href={`/controls/flows?selected=${display.id}`}>Discard changes</Link>
          <button type="button" style={styles.secondaryButton} disabled={!canManage} onClick={(event) => { event.currentTarget.focus(); setEditing(true); }}>Save draft</button>
        </div>
      </header>

      <main style={styles.main}>
        {message ? <p style={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
        <section style={styles.canvas}>
          <header>
            <div><h2>{display.name} · {display.status}</h2><p>{steps.length} steps · 1 handoff to a person · updated {formatDateTime(display.updated_at)}</p></div>
            {draft ? <i>Draft changes</i> : <i>Historical published version · inactive</i>}
          </header>
          <div style={styles.steps}>
            {steps.map((step, index) => (
              <div key={step.id}>
                <button type="button" style={styles.step} data-selected={selectedStep.id === step.id} data-automatic={step.automatic} onClick={() => setSelectedStepId(step.id)}>
                  <span style={styles.stepIcon}>{step.icon}</span>
                  <span style={styles.stepBody}>
                    <span style={styles.stepKind}>{step.kind}</span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                  <span style={styles.stepStat}>{step.stat}</span>
                  <span style={styles.drag} aria-hidden="true" />
                </button>
                {index < steps.length - 1 ? (
                  <div style={styles.connector}><span aria-hidden="true">↓</span><button type="button" disabled={!canManage} onClick={(event) => { event.currentTarget.focus(); setEditing(true); }}>+ Insert step</button></div>
                ) : null}
              </div>
            ))}
          </div>
          <footer><i /><span>A flow may gather, draft, assign and notify. Approving, denying or writing off money always requires a named person.</span></footer>
        </section>

        <aside style={styles.rail}>
          <section style={styles.inspector}>
            <header><h2>{selectedStep.label}</h2><p>{selectedStep.kind} step</p></header>
            <div style={styles.settings}>
              {selectedStep.settings.map((setting) => <label key={setting.label}><span>{setting.label}</span><button type="button" disabled={!canManage} onClick={(event) => { event.currentTarget.focus(); setEditing(true); }}>{setting.value}<i>⌄</i></button></label>)}
            </div>
            {selectedStep.warning ? <div style={styles.warning}><strong><i />{selectedStep.warning.title}</strong><p>{selectedStep.warning.body}</p></div> : null}
            <footer><button type="button" disabled={!canManage} onClick={(event) => { event.currentTarget.focus(); setEditing(true); }}>Duplicate</button><button type="button" style={styles.removeButton} disabled={!canManage || selectedStep.id === "decision"} onClick={(event) => { event.currentTarget.focus(); setEditing(true); }}>Remove step</button></footer>
          </section>

          <section style={styles.dryRun}>
            <header><h2>Test run</h2><i>No real events</i></header>
            <div style={styles.dryFigures}>
              <div><span>Would run</span><b>{testResult ? (testResult.matched ? "1 event" : "0 events") : "— Unavailable"}</b></div>
              <div><span>Would hold</span><b>{testResult ? (testResult.matched ? "0 held" : "1 held") : "— Unavailable"}</b></div>
            </div>
            <div style={styles.dryState}>
              {testResult ? <><code>Sample event</code><span>{testResult.plannedActions.length} bounded action{testResult.plannedActions.length === 1 ? "" : "s"}</span><i data-tone={testResult.matched ? "ok" : "hold"}>{testResult.matched ? "Would run" : "Would hold"}</i></> : <p>Run a source-shaped sample event to inspect this version. Historical 30-day replay is unavailable.</p>}
            </div>
            <button type="button" onClick={(event) => { event.currentTarget.focus(); openTest(); }}>Run dry test</button>
          </section>

          <section style={styles.publishing} data-state-id="flow-pilot-boundary">
            <h2>Pilot boundary</h2>
            <ul>
              <li data-ok="true"><i>✓</i><span>Draft editing and sample-event testing perform no live write.</span></li>
              <li data-ok="true"><i>✓</i><span>Outputs are limited to tasks, evidence requests, deadlines, and in-app notification requests.</span></li>
              <li data-ok="false"><i>!</i><span>Publication and live execution are unavailable until dispatcher idempotency, replay, audit, and failure recovery are independently proved.</span></li>
            </ul>
          </section>
        </aside>
      </main>

      {editing ? <FlowOverlay busy={busy === "save"} onClose={() => setEditing(false)} title={draft ? "Edit flow draft" : "Create flow draft"} description="Only the draft changes. Any historical published version remains untouched and inactive.">
        <FlowEditor initial={display} fixedName submitLabel={draft ? "Save draft" : "Create draft version"} onCancel={() => setEditing(false)} onSubmit={save} />
      </FlowOverlay> : null}

      {testOpen ? <FlowOverlay busy={busy === "test"} onClose={() => setTestOpen(false)} title="Test event" description="Try this flow with sample values. No real event is created and no live write is performed." footer={<><button type="button" disabled={busy === "test"} onClick={() => setTestOpen(false)} style={styles.secondaryButton}>Cancel</button><button type="button" onClick={() => void testFlow()} disabled={busy === "test"} style={{ ...styles.secondaryButton, background: '#1c1f23', color: '#fff', boxShadow: 'none' }}>{busy === "test" ? "Testing…" : "Run test"}</button></>}>
        {display.conditions.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>{display.conditions.map((condition, index) => <label key={`${condition.field}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}><span>{FIELD_LABELS[condition.field] ?? condition.field.replaceAll("_", " ")}</span><input style={{ width: '100%', height: 34, border: 0, borderRadius: 8, padding: '0 9px', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#1c1f23', font: "400 12px/1.3 'Inter',sans-serif" }} value={sampleValues[condition.field] ?? ""} onChange={(event) => setSampleValues((currentValues) => ({ ...currentValues, [condition.field]: event.target.value }))} /></label>)}</div> : <p style={{ color: '#7a5310', font: "400 11.5px/1.5 'Inter',sans-serif" }}>This flow has no conditions, so every event with the configured trigger will match.</p>}
        {testResult ? <div style={{ marginTop: 14, borderRadius: 10, background: '#eef6f1', padding: '12px 13px' }} role="status"><p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#1a6b43', font: "500 12.5px/1.4 'Inter',sans-serif" }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1a6b43" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="5.2"/><path d="m4.5 7.2 1.6 1.6 3.4-3.6"/></svg>{testResult.matched ? "Event matched" : "Event did not match"}</p><p style={{ margin: '4px 0 0', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{testResult.matched ? `${testResult.plannedActions.length} actions planned` : "No actions planned"} · {testResult.writesPerformed} writes performed</p></div> : null}
      </FlowOverlay> : null}

    </div>
  );
}
