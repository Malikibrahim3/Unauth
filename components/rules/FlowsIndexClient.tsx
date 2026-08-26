"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, Modal } from "@/components/ui";
import { FlowEditor, type FlowDraftPayload } from "@/components/rules/FlowEditor";
import { formatDateTime, formatNumber } from '@/lib/utils/format';

export type FlowIndexRecord = {
  name: string;
  description: string | null;
  hrefId: string;
  trigger: string;
  status: "draft" | "published" | "retired";
  active: boolean;
  version: number;
  publishedVersion: number | null;
  hasDraft: boolean;
  actionCount: number;
  actions: string[];
  runCount: number;
  heldCount: number;
  updatedAt: string;
};

function lifecycle(flow: FlowIndexRecord) {
  if (flow.active) return 'Live';
  if (flow.status === 'draft') return 'Draft';
  if (flow.status === 'retired') return 'Retired';
  return 'Paused';
}

function stepTone(kind: 'trigger' | 'automatic' | 'decision') {
  if (kind === 'decision') return 'warning';
  if (kind === 'automatic') return 'positive';
  return 'accent';
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className="uo-status" data-tone={tone}>{children}</span>;
}

export function FlowsIndexClient({
  flows,
  canManage,
}: {
  flows: FlowIndexRecord[];
  canManage: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = searchParams.get('selected');
  const [selectedName, setSelectedName] = useState(requested ?? flows[0]?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const selected = flows.find((flow) => flow.name === selectedName) ?? flows[0] ?? null;
  const creating = searchParams.get('new') === '1';
  const liveCount = flows.filter((flow) => flow.active).length;
  const draftCount = flows.filter((flow) => flow.status === 'draft').length;
  const runCount = flows.reduce((sum, flow) => sum + flow.runCount, 0);
  const heldCount = flows.reduce((sum, flow) => sum + flow.heldCount, 0);
  const automationRate = runCount > 0 ? Math.round(((runCount - heldCount) / runCount) * 100) : null;

  const steps = useMemo(() => {
    if (!selected) return [];
    const result: Array<{ kind: 'trigger' | 'automatic' | 'decision'; label: string; detail: string }> = [
      { kind: 'trigger', label: selected.trigger.replaceAll('_', ' '), detail: `${formatNumber(selected.runCount)} trigger${selected.runCount === 1 ? '' : 's'} in the last 30 days` },
    ];
    selected.actions.forEach((action, index) => result.push({
      kind: 'automatic',
      label: action,
      detail: `Bounded action ${index + 1} of ${selected.actions.length}`,
    }));
    result.push({
      kind: 'decision',
      label: 'A named person records any merchant decision',
      detail: `${formatNumber(selected.heldCount)} run${selected.heldCount === 1 ? '' : 's'} currently held or waiting`,
    });
    return result;
  }, [selected]);

  function closeCreate() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('new');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  function selectFlow(name: string) {
    setSelectedName(name);
    const next = new URLSearchParams(searchParams.toString());
    next.set('selected', name);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  async function create(payload: FlowDraftPayload) {
    setError(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Flow draft could not be created");
      router.push(`/controls/flows/${body.workflow.id}`);
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Flow draft could not be created");
      return false;
    }
  }

  return (
    <>
      <div className="uo-page-stack" data-operations-surface="flows">
        <div className="uo-kpi-grid">
          <div className="uo-kpi"><span>Active execution</span><strong data-tone={liveCount ? 'warning' : 'positive'}>{formatNumber(liveCount)}</strong><small>{formatNumber(draftCount)} draft · pilot publication is unavailable</small></div>
          <div className="uo-kpi"><span>Runs, 30 days</span><strong>{formatNumber(runCount)}</strong><small>across every retained flow version</small></div>
          <div className="uo-kpi"><span>Held for a person</span><strong data-tone="warning">{formatNumber(heldCount)}</strong><small>waiting on an explicit decision or completion</small></div>
          <div className="uo-kpi"><span>Automation rate</span><strong data-tone="accent">{automationRate == null ? '—' : `${automationRate}%`}</strong><small>{automationRate == null ? '— Unavailable · no runs in scope' : 'completed without a hold · live flows'}</small></div>
        </div>

        {error ? <p className="uo-inline-state" role="alert" data-tone="critical">{error}</p> : null}

        {flows.length && selected ? (
          <div className="uo-flows-layout">
            <section className="uo-card uo-flow-list" aria-label="Automation flows">
              <header className="uo-card-header uo-card-header--split"><div><h2>Automation flows</h2><p>Every decision step remains visible and human-owned.</p></div><span className="uo-muted">{formatNumber(flows.length)} flows</span></header>
              <div>
                {flows.map((flow) => {
                  const state = lifecycle(flow);
                  return <button type="button" key={flow.name} data-selected={flow.name === selected.name ? 'true' : undefined} onClick={() => selectFlow(flow.name)}>
                    <span><i data-tone={flow.active ? 'positive' : 'neutral'} /><b>{flow.name}</b><StatusPill tone={flow.active ? 'positive' : flow.status === 'draft' ? 'warning' : 'neutral'}>{state}</StatusPill></span>
                    <small>v{flow.version} · owner unavailable · changed {formatDateTime(flow.updatedAt)} · {flow.runCount ? `${formatNumber(flow.runCount)} runs, ${formatNumber(flow.heldCount)} held` : 'no runs in scope'}</small>
                  </button>;
                })}
              </div>
            </section>

            <section className="uo-card uo-flow-detail">
              <header className="uo-flow-detail__header"><div><span>{lifecycle(selected)} flow · v{selected.version} · owner unavailable · changed {formatDateTime(selected.updatedAt)}</span><h2>{selected.name}</h2><p>{selected.description || 'No operator-facing intent has been recorded.'}</p></div><div><StatusPill tone={selected.active ? 'positive' : selected.status === 'draft' ? 'warning' : 'neutral'}>{lifecycle(selected)}</StatusPill><Link href={`/controls/flows/${selected.hrefId}`} aria-label={`Open ${selected.name}`}>Open</Link></div></header>
              <div className="uo-flow-steps">
                {steps.map((step, index) => <div className="uo-flow-step" key={`${step.kind}-${step.label}`}>
                  <div><i data-tone={stepTone(step.kind)}>{index + 1}</i>{index < steps.length - 1 ? <span /> : null}</div>
                  <div><small>{step.kind === 'automatic' ? 'Automated' : step.kind === 'decision' ? 'Decision' : 'Trigger'}</small><strong>{step.label}</strong><p>{step.detail}</p></div>
                  <StatusPill tone={stepTone(step.kind)}>{step.kind === 'decision' ? 'Person-owned' : step.kind === 'trigger' ? 'Observed' : 'Bounded'}</StatusPill>
                </div>)}
              </div>
              <div className="uo-flow-guardrail">A flow may gather, draft, assign and notify. Approving, denying or writing off money always requires a named person.</div>
              <div className="uo-flow-activity"><h3>Recent activity</h3><p>Open the run log for immutable execution events; no activity is inferred from the flow definition.</p><Link href={`/controls/flows/runs?workflow=${encodeURIComponent(selected.hrefId)}`}>Open run log</Link></div>
              <footer><div><span>Runs</span><strong>{formatNumber(selected.runCount)}</strong></div><div><span>Held</span><strong data-tone="warning">{formatNumber(selected.heldCount)}</strong></div><div><span>Auto-completed</span><strong data-tone="positive">{selected.runCount ? `${Math.round(((selected.runCount - selected.heldCount) / selected.runCount) * 100)}%` : '—'}</strong></div><Link href={`/controls/flows/${selected.hrefId}`} className="ua-button ua-button--primary ua-button--sm">{selected.status === 'draft' ? 'Review draft' : 'Open flow'}</Link></footer>
            </section>
          </div>
        ) : (
          <div className="uo-card" data-state-id="flows-empty-state"><EmptyState title="Create the first bounded flow draft" description="Build and dry-test a draft without live writes. Publication and live execution are not part of the pilot contract." action={canManage ? <Link href="/controls/flows?new=1" className="ua-button ua-button--primary ua-button--sm">Create first draft</Link> : <Link href="/help" className="ua-button ua-button--secondary ua-button--sm">Review flow permissions</Link>} /></div>
        )}
      </div>

      <Modal open={creating} onClose={closeCreate} title="New flow draft" description="Build a trigger, conditions, and bounded actions for dry testing. Live publication is unavailable in the pilot." overlayId="new-flow-draft-modal">
        <FlowEditor onCancel={closeCreate} onSubmit={create} submitLabel="Create draft" />
      </Modal>
    </>
  );
}
