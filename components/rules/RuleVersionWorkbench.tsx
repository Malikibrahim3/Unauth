'use client';

import Link from 'next/link';
import { RuleImpactPreview, type ImpactResponse } from './RuleImpactPreview';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ConditionBlock } from '@/components/rules/ConditionBlock';
import { ACTION_LABELS, summarizeConditions } from '@/lib/rules/summary';
import { FIELD_DEFS_BY_NAME, FIELD_LABELS, RULE_FIELDS, validateConditions } from '@/lib/rules/fields';
import { MONETARY_RULE_FIELDS, normalizeRuleCondition, type ConditionOperator, MerchantRule, RuleAction, RuleCondition } from '@/lib/rules-engine';

export type RuleVersionRecord = {
  id: string;
  version: number;
  status: 'draft' | 'published' | 'retired' | 'discarded';
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: MerchantRule['action'];
  condition_operator: MerchantRule['condition_operator'];
  priority: number;
  created_at: string;
  published_at: string | null;
  published_by?: string | null;
  supersedes_version_id?: string | null;
};

type PublishPreview = { noCases: boolean; version: number; dataRequirements: string[]; conflicts: Array<{ ruleId: string; name: string; reason: string }> };
type SimulationResult = { version: number; simulation: { matched: boolean; recommendedAction: MerchantRule['action'] | null; matchedConditions: RuleCondition[]; writesPerformed: number; certainty?: string; missingInputs?: string[] }; notice: string };
type OverlayMode = 'editor' | 'simulation' | 'publication' | null;

const fieldStyle = { boxSizing: 'border-box', width: '100%', height: 34, border: 0, borderRadius: 8, padding: '0 9px', background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#1c1f23', font: "400 12px/1.3 'Inter',sans-serif", outline: 'none' } as const;
const paleButtonStyle = { padding: '7px 12px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' } as const;
const darkButtonStyle = { padding: '7px 13px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", cursor: 'pointer' } as const;

function stateFor(version: RuleVersionRecord, live: RuleVersionRecord | null) {
  if (version.status === 'draft') return 'DRAFT';
  if (version.id === live?.id || version.status === 'published') return 'LIVE';
  return 'SUPERSEDED';
}

function blankCondition(): RuleCondition {
  const field = RULE_FIELDS[0]!;
  return { id: `condition-${Date.now()}`, field: field.field, operator: field.operators[0]!, value: field.options?.[0]?.value ?? '' };
}

function ModalCanvas({ title, description, close, footer, children, semantic = true, pending = false }: { title: string; description: string; close: () => void; footer: ReactNode; children: ReactNode; semantic?: boolean; pending?: boolean }) {
  const { containerRef } = useOverlayPresence({ open: true, onClose: close, trapFocus: true, lockBodyScroll: true, restoreFocus: true, closeOnEscape: !pending });
  return (
    <OverlayPortal><div aria-label={title} {...(semantic ? { role: 'dialog', 'aria-modal': true } : {})} data-overlay-id={semantic ? 'rule-simulation-and-publication-modals' : 'rule-editor-canvas'} style={{ pointerEvents: 'auto', position: 'fixed', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div ref={containerRef as React.RefObject<HTMLDivElement>} style={{ width: 900, maxWidth: '100%', maxHeight: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{title}</div><div style={{ font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 4 }}>{description}</div></div>
          <button type="button" aria-label="Close dialog" disabled={pending} onClick={close} style={{ flex: 'none', marginTop: 3, padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>{children}</div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff' }}>{footer}</div>
      </div>
    </div></OverlayPortal>
  );
}

function ConsequenceRows({ name, version, conflicts }: { name: string; version: number; conflicts: number }) {
  const rows = [
    ['OBJECT', `${name} · version ${version}`],
    ['VALUE', 'Future rule evaluations in this workspace'],
    ['EXTERNAL ACTION', 'Publishes recommendation logic only; it does not record a merchant decision or contact a provider'],
    ['REVERSIBLE', 'Yes — copy an earlier version into a new draft, then review and publish it explicitly'],
    ['APPEND-ONLY', `Named publisher, version, ${conflicts} conflicts accepted, and publication time in the rule audit history`],
  ];
  return <div style={{ borderRadius: 10, background: '#f4f3f1', padding: '5px 12px' }}>{rows.map(([label, value]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: '118px 1fr', gap: 12, padding: '8px 0', borderTop: '1px solid #e4e3e0' }}><span style={{ color: '#64686d', font: "400 9.5px/1.4 'IBM Plex Mono',monospace" }}>{label}</span><span style={{ color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{value}</span></div>)}</div>;
}

export function RuleVersionWorkbench({ ruleId, initialVersions, canManage }: { ruleId: string; initialVersions: RuleVersionRecord[]; canManage: boolean }) {
  const router = useRouter();
  const [versions, setVersions] = useState(initialVersions);
  const draft = versions.find((version) => version.status === 'draft') ?? null;
  const live = versions.find((version) => version.status === 'published') ?? null;
  const selected = draft ?? live ?? versions[0]!;
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('editor');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(null);
  const [simulationValues, setSimulationValues] = useState<Record<string, string>>({});
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [name, setName] = useState(selected.name);
  const [description, setDescription] = useState(selected.description ?? '');
  const [conditions, setConditions] = useState<RuleCondition[]>(selected.conditions.map((condition, index) => normalizeRuleCondition({ ...condition, id: condition.id || `${ruleId}:condition:${index}` })));
  const [operator, setOperator] = useState<ConditionOperator>(selected.condition_operator);
  const [action, setAction] = useState<RuleAction>(selected.action);

  const [impact, setImpact] = useState<{ key: string; result: ImpactResponse } | null>(null);
  const [acknowledgeNoCases, setAcknowledgeNoCases] = useState(false);
  const proposal = { ruleId, candidate: { name: name.trim(), description: description.trim() || null, conditions, action, condition_operator: operator, priority: selected.priority } };
  const proposalKey = JSON.stringify(proposal);
  const impactToken = impact?.key === proposalKey ? impact.result.impactToken : null;

  const validationError = operator !== 'and' && operator !== 'or' ? 'Unsupported condition grouping. Review it before saving.' : validateConditions(conditions)[0]?.message;

  function notifyRuntimeInteraction() {
    window.dispatchEvent(new Event('unauth:rule-runtime-interaction'));
  }

  async function refresh() {
    const response = await fetch(`/api/rules/${ruleId}/versions`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Could not reload versions');
    setVersions(body.versions ?? []);
  }

  async function saveDraft() {
    notifyRuntimeInteraction();
    if (validationError) { setMessage({ tone: 'error', text: validationError }); return; }
    if (!name.trim()) { setMessage({ tone: 'error', text: 'Rule name is required.' }); return; }
    setImpact(null);
    setBusy('save');
    setMessage(null);
    try {
      const endpoint = draft ? `/api/rules/${ruleId}/versions/${draft.id}` : `/api/rules/${ruleId}/versions`;
      const response = await fetch(endpoint, {
        method: draft ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, conditions, action, condition_operator: operator, priority: selected.priority }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rule draft could not be saved');
      await refresh();
      setMessage({ tone: 'success', text: 'Rule draft saved. The published recommendation remains unchanged.' });
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Rule draft could not be saved' });
    } finally {
      setBusy(null);
    }
  }

  function openSimulation() {
    notifyRuntimeInteraction();
    setMessage(null);
    setSimulationResult(null);
    setSimulationValues(Object.fromEntries(selected.conditions.map((condition) => [condition.field, Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value ?? '')])));
    setOverlayMode('simulation');
  }

  async function simulate() {
    const signals: Record<string, unknown> = {};
    for (const field of [...new Set(selected.conditions.map((condition) => condition.field))]) {
      const raw = simulationValues[field]?.trim() ?? '';
      if (!raw) { setMessage({ tone: 'error', text: `Enter a simulation value for ${FIELD_LABELS[field] ?? field.replaceAll('_', ' ')}.` }); return; }
      const definition = FIELD_DEFS_BY_NAME[field];
      if (MONETARY_RULE_FIELDS.has(field)) signals[`${field}_currency`] = simulationValues[`${field}_currency`]?.trim() || null;
      signals[field] = definition?.type === 'integer' || definition?.type === 'decimal' ? Number(raw) : definition?.type === 'boolean' ? raw === 'true' : definition?.type === 'string_array' ? raw.split(',').map((value) => value.trim()).filter(Boolean) : raw;
    }
    setBusy('simulate');
    setMessage(null);
    setSimulationResult(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signals) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Simulation failed');
      setSimulationResult(body);
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Simulation failed' });
    } finally {
      setBusy(null);
    }
  }

  async function previewPublish() {
    notifyRuntimeInteraction();
    if (!draft) return;
    setBusy('preview');
    setMessage(null);
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ impactToken }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Publish preview failed');
      setPublishPreview(body);
      setAcknowledgeNoCases(false);
      setOverlayMode('publication');
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Publish preview failed' });
    } finally {
      setBusy(null);
    }
  }

  async function confirmPublish() {
    setBusy('publish');
    try {
      const response = await fetch(`/api/rules/${ruleId}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, impactToken, acknowledgeNoCases, acceptConflicts: Boolean(publishPreview?.conflicts.length) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Publish failed');
      setPublishPreview(null);
      await refresh();
      setOverlayMode('editor');
      setMessage({ tone: 'success', text: `Version ${body.published.version} published atomically.` });
    } catch (reason) {
      setMessage({ tone: 'error', text: reason instanceof Error ? reason.message : 'Publish failed' });
    } finally {
      setBusy(null);
    }
  }

  const closeToRegistry = () => router.push(`/controls/rules?selected=${ruleId}`);
  const status = stateFor(selected, live);

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }} data-operations-surface="rule-versions">
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)' }}><span style={{ font: "400 12.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>Scope: all channels</span><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4" /></svg></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)' }}><span style={{ font: "400 12.5px/1 'Inter',sans-serif", color: '#1c1f23' }}>State: {status.toLowerCase()}</span><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4" /></svg></div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={openSimulation} style={paleButtonStyle}>Simulate v{selected.version}</button>
        {draft && canManage ? <button type="button" onClick={() => void previewPublish()} disabled={busy != null || !impactToken} style={darkButtonStyle}>Publish draft v{draft.version}</button> : null}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        {message ? <div role={message.tone === 'error' ? 'alert' : 'status'} style={{ padding: '9px 12px', borderRadius: 9, background: message.tone === 'error' ? '#fdf0e6' : '#eef6f1', color: message.tone === 'error' ? '#b0431a' : '#1a6b43', font: "400 11px/1.45 'Inter',sans-serif" }}>{message.text}</div> : null}
        <section style={{ flex: 'none', background: '#f4f3f1', borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 0' }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHAT THE RULE DID LAST 30 DAYS</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>per-version evaluation receipts are not retained</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>{['DECIDED WITHOUT A HUMAN', 'VALUE RECOMMENDED', 'HELD FOR REVIEW', 'OVERTURNED BY A HUMAN'].map((label) => <div key={label} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>{label}</div><div style={{ font: "400 22px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</div><div><span style={{ padding: '2px 7px', borderRadius: 5, background: '#f4f3f1', font: "500 10px/1.5 'Inter',sans-serif", color: '#64686d' }}>UNAVAILABLE</span></div><div style={{ font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>not retained by source</div></div>)}</div>
        </section>
        <section style={{ flex: 1, minHeight: 0, background: '#f4f3f1', borderRadius: 13, padding: 11, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 0' }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>VERSIONS</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>publication is atomic · earlier versions remain readable</span></div>
          <div style={{ flex: 1, minHeight: 0, background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 250px 118px 100px 74px 122px', gap: 10, padding: '9px 14px', borderBottom: '1px solid #eae8e5', background: '#ffffff' }}>{['#', 'WHEN', 'THEN', 'SCOPE', 'CREATED', '30D', 'STATE'].map((label) => <span key={label} style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em', color: '#64686d', textAlign: label === '30D' ? 'right' : 'left' }}>{label}</span>)}</div>
            {versions.map((version) => <div key={version.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 250px 118px 100px 74px 122px', gap: 10, padding: '11px 14px', alignItems: 'center', borderTop: '1px solid #f4f2ef', background: version.id === selected.id ? '#fbfaf8' : '#fff' }}><span style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>v{version.version}</span><span style={{ minWidth: 0 }}><span style={{ display: 'block', font: "400 12px/1.45 'Inter',sans-serif", color: '#40454a' }}>{version.name}</span><span style={{ display: 'block', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.conditions.length ? summarizeConditions(version.conditions, version.condition_operator) : 'all evaluated cases'}</span></span><span style={{ font: "500 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{ACTION_LABELS[version.action]}</span><span style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", color: '#40454a' }}>all channels</span><span style={{ font: "400 10.5px/1.3 'IBM Plex Mono',monospace", color: '#64686d' }}>{new Date(version.published_at ?? version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span style={{ textAlign: 'right', font: "400 11.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span><span style={{ padding: '2px 7px', borderRadius: 5, background: stateFor(version, live) === 'LIVE' ? '#eef6f1' : stateFor(version, live) === 'DRAFT' ? '#fff3e9' : '#f4f3f1', font: "500 10px/1.5 'Inter',sans-serif", color: stateFor(version, live) === 'LIVE' ? '#1a6b43' : stateFor(version, live) === 'DRAFT' ? '#7a5310' : '#64686d' }}>{stateFor(version, live)}</span></span></div>)}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff' }}><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{versions.length} versions · impact unavailable</span><div style={{ flex: 1 }} /><Link href={`/controls/rules?selected=${ruleId}`} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "500 11.5px/1 'Inter',sans-serif", color: '#1c1f23', textDecoration: 'none' }}>Decision order</Link></div>
          </div>
        </section>
      </div>

      {overlayMode === 'editor' ? <ModalCanvas pending={busy != null} semantic={true} title={`Rule · ${name}`} description={description || `Version ${selected.version} · ${status.toLowerCase()}`} close={closeToRegistry} footer={<><span style={{ flex: 1, minWidth: 0, color: message?.tone === 'error' ? '#b0431a' : '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>{validationError ?? message?.text ?? 'saving a draft does not change any live recommendation'}</span><button type="button" onClick={closeToRegistry} disabled={busy != null} style={paleButtonStyle}>Cancel</button><button type="button" onClick={openSimulation} style={paleButtonStyle}>Simulate v{selected.version}</button>{canManage ? <button type="button" onClick={() => void saveDraft()} disabled={busy === 'save' || Boolean(validationError)} style={{ ...darkButtonStyle, opacity: busy === 'save' ? .55 : 1 }}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button> : null}</>}>
        <RuleImpactPreview proposal={proposal} disabled={Boolean(validationError) || !name.trim() || busy != null} onPreview={result => setImpact(result ? { key: proposalKey, result } : null)} />
        {draft && canManage ? <button type="button" style={darkButtonStyle} disabled={!impactToken || busy != null} onClick={() => void previewPublish()}>Review publication</button> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>RULE NAME<input aria-label="Rule name" style={fieldStyle} value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>DESCRIPTION<input aria-label="Description" style={fieldStyle} value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canManage} /></label>
        </div>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>WHEN</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{operator === 'and' ? 'every condition must be true' : 'any condition may be true'}</span>{canManage && conditions.length > 1 ? <button type="button" onClick={() => setOperator((current) => current === 'and' ? 'or' : 'and')} style={{ ...paleButtonStyle, padding: '5px 8px', fontSize: 10 }}>{operator.toUpperCase()}</button> : null}</div>
          {conditions.map((condition, index) => <ConditionBlock key={condition.id || index} condition={condition} onChange={(next) => setConditions((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemove={() => setConditions((current) => current.filter((_, entryIndex) => entryIndex !== index))} />)}
          {canManage ? <button type="button" onClick={() => setConditions((current) => [...current, blankCondition()])} style={{ ...paleButtonStyle, alignSelf: 'flex-start', padding: '5px 10px', fontSize: 11.5 }}>+ Add condition</button> : null}
        </div>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 3px 0' }}><span style={{ flex: 1, font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>THEN</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>one recommendation per rule</span></div>
          {(['approve', 'manual_review', 'deny'] as RuleAction[]).map((candidate) => <button key={candidate} type="button" role="radio" aria-checked={action === candidate} onClick={() => canManage && setAction(candidate)} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: 0, border: 0, background: 'transparent', textAlign: 'left', cursor: canManage ? 'pointer' : 'default' }}><span style={{ width: 14, height: 14, flex: 'none', borderRadius: '50%', marginTop: 1, boxShadow: action === candidate ? 'inset 0 0 0 4px #1c1f23,inset 0 0 0 1.3px #1c1f23' : 'inset 0 0 0 1.3px rgba(28,27,25,.18)' }} /><span style={{ flex: 1, color: '#1c1f23', font: "400 12px/1.45 'Inter',sans-serif" }}>{ACTION_LABELS[candidate]}<span style={{ display: 'block', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif", marginTop: 2 }}>A person still owns and records the merchant decision.</span></span></button>)}
        </div>
      </ModalCanvas> : null}

      {overlayMode === 'simulation' ? <ModalCanvas pending={busy != null} title="Simulate rule version" description="Evaluate source-shaped values against this version. No case, decision, audit event, provider action, or money record is created." close={() => setOverlayMode(null)} footer={<><span style={{ flex: 1, color: message?.tone === 'error' ? '#b0431a' : '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>{message?.text ?? `version ${selected.version} · supplied test values · no real events`}</span><button type="button" onClick={() => setOverlayMode('editor')} disabled={busy != null} style={paleButtonStyle}>Cancel</button><button type="button" onClick={() => void simulate()} disabled={busy === 'simulate'} style={darkButtonStyle}>{busy === 'simulate' ? 'Simulating…' : 'Run simulation'}</button></>}>
        <div style={{ background: '#f4f3f1', borderRadius: 12, padding: 11, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {[...new Set(selected.conditions.map((condition) => condition.field))].map((field) => {
            const definition = FIELD_DEFS_BY_NAME[field];
            const label = FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
            const setValue = (value: string) => setSimulationValues((values) => ({ ...values, [field]: value }));
            return <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>{label.toUpperCase()}{definition?.type === 'boolean' ? <select aria-label={label} style={fieldStyle} value={simulationValues[field] ?? ''} onChange={(event) => setValue(event.target.value)}><option value="">Select a value</option><option value="true">Yes</option><option value="false">No</option></select> : definition?.type === 'enum' ? <select aria-label={label} style={fieldStyle} value={simulationValues[field] ?? ''} onChange={(event) => setValue(event.target.value)}><option value="">Select a value</option>{definition.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input aria-label={label} style={fieldStyle} type={definition?.type === 'integer' || definition?.type === 'decimal' ? 'number' : 'text'} value={simulationValues[field] ?? ''} onChange={(event) => setValue(event.target.value)} />}</label>;
          })}
          {[...new Set(selected.conditions.filter(condition => MONETARY_RULE_FIELDS.has(condition.field)).map(condition => condition.field))].map(field => <label key={`${field}-currency`}>Actual {FIELD_LABELS[field]} currency<input style={fieldStyle} maxLength={3} value={simulationValues[`${field}_currency`] ?? ''} onChange={event => setSimulationValues(values => ({ ...values, [`${field}_currency`]: event.target.value.toUpperCase() }))} /></label>)}
          {!selected.conditions.length ? <div style={{ gridColumn: '1 / -1', color: '#7a5310', font: "400 11.5px/1.5 'Inter',sans-serif" }}>This rule has no conditions, so every evaluated case would match it.</div> : null}
        </div>
        {simulationResult ? <div role="status" style={{ borderRadius: 10, background: '#eef6f1', padding: '12px 13px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a6b43', font: "500 12.5px/1.4 'Inter',sans-serif" }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1a6b43" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="5.2" /><path d="m4.5 7.2 1.6 1.6 3.4-3.6" /></svg>{simulationResult.simulation.certainty === 'insufficient_evidence' ? `Insufficient evidence: ${simulationResult.simulation.missingInputs?.join(', ')}` : simulationResult.simulation.matched ? `Matched · ${ACTION_LABELS[simulationResult.simulation.recommendedAction ?? selected.action]}` : 'Did not match'}</div><div style={{ marginTop: 4, color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>Version {simulationResult.version} · {simulationResult.simulation.matchedConditions.length} matched conditions · {simulationResult.simulation.writesPerformed} writes performed</div></div> : null}
      </ModalCanvas> : null}

      {overlayMode === 'publication' && publishPreview ? <ModalCanvas pending={busy != null} title="Publish rule version" description="Publication is atomic. The existing version remains active if any step fails." close={() => { setPublishPreview(null); setOverlayMode('editor'); }} footer={<><span style={{ flex: 1, color: '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>only future evaluations use this version · history remains readable</span><button type="button" onClick={() => { setPublishPreview(null); setOverlayMode('editor'); }} disabled={busy != null} style={paleButtonStyle}>Cancel</button><button type="button" onClick={() => void confirmPublish()} disabled={busy != null || !impactToken || (publishPreview.noCases && !acknowledgeNoCases)} style={darkButtonStyle}>{busy === 'publish' ? 'Publishing…' : `Publish v${publishPreview.version}`}</button></>}>
        {publishPreview.noCases ? <label><input type="checkbox" checked={acknowledgeNoCases} onChange={event => setAcknowledgeNoCases(event.target.checked)} /> I acknowledge that no case-based preview is available for this initial policy.</label> : null}
        <ConsequenceRows name={name} version={publishPreview.version} conflicts={publishPreview.conflicts.length} />
        <div style={{ background: '#f4f3f1', borderRadius: 10, padding: '11px 12px', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}><strong style={{ color: '#1c1f23', fontWeight: 500 }}>Required data:</strong> {publishPreview.dataRequirements.join(', ') || 'None'}{publishPreview.conflicts.length ? <div style={{ marginTop: 7, color: '#7a5310' }}>{publishPreview.conflicts.length} conflict{publishPreview.conflicts.length === 1 ? '' : 's'} require explicit acceptance: {publishPreview.conflicts.map((conflict) => conflict.name).join(', ')}.</div> : <div style={{ marginTop: 7, color: '#1a6b43' }}>No same-priority condition conflicts detected.</div>}</div>
      </ModalCanvas> : null}
    </div>
  );
}
