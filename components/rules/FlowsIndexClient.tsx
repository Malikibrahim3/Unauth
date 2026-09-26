'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlowEditor, type FlowDraftPayload } from '@/components/rules/FlowEditor';
import { formatNumber } from '@/lib/utils/format';

export type FlowIndexRecord = {
  name: string;
  description: string | null;
  hrefId: string;
  trigger: string;
  status: 'draft' | 'published' | 'retired';
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
  if (flow.active) return 'LIVE';
  if (flow.status === 'draft') return 'DRAFT';
  if (flow.status === 'retired') return 'RETIRED';
  return 'PAUSED';
}

function StatePill({ flow }: { flow: FlowIndexRecord }) {
  const state = lifecycle(flow);
  return <span style={{ padding: '2px 6px', borderRadius: 5, background: state === 'LIVE' ? '#eef6f1' : state === 'DRAFT' ? '#fff3e9' : state === 'PAUSED' ? '#fdf0e6' : '#f4f3f1', color: state === 'LIVE' ? '#1a6b43' : state === 'DRAFT' ? '#7a5310' : state === 'PAUSED' ? '#b0431a' : '#64686d', font: "500 9.5px/1.5 'Inter',sans-serif" }}>{state}</span>;
}

export function FlowsIndexClient({ flows, canManage }: { flows: FlowIndexRecord[]; canManage: boolean }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = searchParams.get('selected');
  const [selectedName, setSelectedName] = useState(requested ?? flows[0]?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const selected = flows.find((flow) => flow.name === selectedName) ?? flows[0] ?? null;
  const creating = searchParams.get('new') === '1';

  const nodes = useMemo(() => {
    if (!selected) return [];
    return [
      { kind: 'TRIGGER', title: selected.trigger.replaceAll(/[._]/g, ' '), note: 'Starts when the retained domain event is written' },
      ...selected.actions.map((action, index) => ({ kind: 'ACTION', title: action, note: `Bounded action ${index + 1} of ${selected.actions.length}` })),
      { kind: 'STOP', title: 'A named person owns any decision', note: 'Flows may route work; they never record a merchant decision' },
    ];
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
      const response = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Flow draft could not be created');
      router.push(`/controls/flows/${body.workflow.id}`);
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Flow draft could not be created');
      return false;
    }
  }

  if (!selected) {
    return (
      <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px' }} data-screen-label="Flows" data-visual-world="supplied-package" data-surface-id="flows-registry" data-archetype="P5" data-operations-surface="flows">
        <div data-state-id="flows-empty-state" style={{ height: '100%', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}><strong style={{ font: "500 13px/1.35 'Inter',sans-serif" }}>Create the first bounded flow draft</strong><span style={{ maxWidth: 460, textAlign: 'center', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Build and dry-test a draft without live writes. Publication and live execution are unavailable in the pilot.</span>{canManage ? <Link href="/controls/flows?new=1" style={{ padding: '7px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Create first draft</Link> : null}</div>
        {creating ? <FlowCreateModal error={error} onClose={closeCreate}><FlowEditor onCancel={closeCreate} onSubmit={create} submitLabel="Create draft" /></FlowCreateModal> : null}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'auto' }} data-screen-label="Flows" data-visual-world="supplied-package" data-surface-id="flows-registry" data-archetype="P5" data-operations-surface="flows">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error ? <div role="alert" style={{ padding: '9px 12px', borderRadius: 9, background: '#fdf0e6', color: '#b0431a', font: "400 11px/1.45 'Inter',sans-serif" }}>{error}</div> : null}
        <section style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '14px 16px', flex: 'none' }} aria-label="Selected flow">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}><span style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>{selected.name.toUpperCase()}</span><StatePill flow={selected} /><div style={{ flex: 1 }} /><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>v{selected.version} · updated {new Date(selected.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>
          <div style={{ position: 'relative', minHeight: 318, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '30px 0' }}>
            <svg width="100%" height="20" viewBox="0 0 1000 20" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }} fill="none" stroke="#d9d4cd" strokeWidth="1.3" aria-hidden="true"><path d="M0 10H1000" /><path d="M990 6l10 4-10 4z" fill="#d9d4cd" stroke="none" /></svg>
            {nodes.map((node, index) => <div key={`${node.kind}-${index}`} style={{ position: 'relative', zIndex: 1, width: 140, minHeight: 96, flex: 'none', background: '#fff', borderRadius: 9, boxShadow: node.kind === 'STOP' ? '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(201,138,26,.45)' : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ font: "400 9px/1 'IBM Plex Mono',monospace", letterSpacing: '.08em', color: node.kind === 'STOP' ? '#7a5310' : '#64686d' }}>{node.kind}</span><span style={{ font: "500 11.5px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{node.title}</span><span style={{ font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>{node.note}</span></div>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, borderTop: '1px solid #eae8e5', paddingTop: 10 }}><span style={{ font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: '#64686d' }}>a flow may gather, draft, assign and notify — it may never change a payout rule or close a period</span><div style={{ flex: 1 }} /><Link href="/controls/rules" style={{ font: "400 10.5px/1.5 'IBM Plex Mono',monospace", color: '#9f4f08', textDecoration: 'none' }}>rules are separate</Link></div>
        </section>

        <section style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '13px 16px 12px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Runs in 30 days">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>RUNS · 30 DAYS</span><div style={{ flex: 1 }} /><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatNumber(selected.runCount)} total · {formatNumber(selected.heldCount)} still waiting</span></div>
          <div role="img" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }} aria-label="Daily run distribution unavailable">{Array.from({ length: 30 }, (_, index) => <span key={index} style={{ flex: 1, height: 6, borderRadius: '2px 2px 0 0', background: index > 26 ? '#f2caa9' : '#d9d4cd' }} />)}</div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #f4f2ef', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Daily run events are available in the immutable run log; this summary retains aggregate counts only.</div>
          <div style={{ display: 'flex', borderTop: '1px solid #f4f2ef', paddingTop: 9 }}><Link href={`/controls/flows/runs?workflow=${encodeURIComponent(selected.hrefId)}`} style={{ color: '#9f4f08', font: "500 11.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Open run log</Link><span style={{ flex: 1 }} /><Link href={`/controls/flows/${selected.hrefId}`} style={{ color: '#40454a', font: "500 11.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Edit steps</Link></div>
        </section>
      </div>

      <aside style={{ width: 300, flex: 'none', background: '#f4f3f1', borderRadius: 13, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11 }} aria-label="Flows">
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>FLOWS</div>
        {flows.map((flow) => <button type="button" key={flow.name} onClick={() => selectFlow(flow.name)} style={{ width: '100%', border: 0, background: '#fff', borderRadius: 10, boxShadow: flow.name === selected.name ? '0 1px 2px rgba(28,27,25,.06),0 0 0 1.5px rgba(242,118,26,.5)' : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 5, textAlign: 'left', cursor: 'pointer' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, font: "500 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{flow.name}</span><StatePill flow={flow} /></span><span style={{ font: "400 11px/1.45 'Inter',sans-serif", color: '#64686d' }}>{formatNumber(flow.runCount)} runs · {formatNumber(flow.heldCount)} waiting · {flow.actionCount} bounded action{flow.actionCount === 1 ? '' : 's'}</span><span style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, marginTop: 3, background: '#e4e3e0' }}><span style={{ width: flow.runCount ? `${Math.max(4, ((flow.runCount - flow.heldCount) / flow.runCount) * 100)}%` : '0%', background: '#1a6b43' }} /><span style={{ flex: 1, background: flow.heldCount ? '#c98a1a' : '#e4e3e0' }} /></span><span style={{ display: 'flex', gap: 10, font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}><span style={{ color: '#1a6b43' }}>{formatNumber(Math.max(0, flow.runCount - flow.heldCount))} complete</span><span style={{ color: '#c98a1a' }}>{formatNumber(flow.heldCount)} waiting</span></span></button>)}
        <div style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', paddingTop: 2 }}>WHAT A FLOW CANNOT DO</div>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}><div style={{ font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Flows act on cases that already exist. They cannot create a loss, overrule a payout rule, close a period, or move money beyond a bounded configured action.</div><div style={{ font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d', borderTop: '1px solid #f4f2ef', paddingTop: 8 }}>Every retained step appears in the immutable run log under the flow&apos;s name.</div></div>
        <div style={{ flex: 1 }} />
        <div style={{ font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d', borderTop: '1px solid #e4e3e0', paddingTop: 10 }}>Publication and live execution remain unavailable under the current pilot contract.</div>
      </aside>

      {creating ? <FlowCreateModal error={error} onClose={closeCreate}><FlowEditor onCancel={closeCreate} onSubmit={create} submitLabel="Create draft" /></FlowCreateModal> : null}
    </div>
  );
}

function FlowCreateModal({ error, onClose, children }: { error: string | null; onClose: () => void; children: React.ReactNode }) {
  return <div role="dialog" aria-modal="true" data-overlay-id="new-flow-draft-modal" style={{ position: 'fixed', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}><div style={{ width: 720, maxWidth: '100%', maxHeight: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>New flow draft</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Build a trigger, conditions, and bounded actions for dry testing. Live publication is unavailable in the pilot.</div></div><button type="button" aria-label="Close dialog" onClick={onClose} style={{ border: 0, padding: 2, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button></div><div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px' }}>{error ? <div role="alert" style={{ marginBottom: 10, padding: '9px 11px', borderRadius: 9, background: '#fdf0e6', color: '#b0431a', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{error}</div> : null}{children}</div></div></div>;
}
