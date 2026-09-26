'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RuleImpactPreview, type ImpactResponse } from './RuleImpactPreview';
import type { MerchantRule } from '@/lib/rules-engine';

export function RuleOrderPreview() {
  const router = useRouter();
  const [rules, setRules] = useState<MerchantRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [review, setReview] = useState(false);
  async function open() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/rules', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Rules unavailable');
      setRules(body.rules.filter((rule: MerchantRule) => rule.is_active));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Rules unavailable'); }
    finally { setBusy(false); }
  }
  function move(index: number, direction: number) {
    if (!rules) return;
    const next = [...rules];
    [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
    setRules(next); setImpact(null); setReview(false);
  }
  async function confirm() {
    if (!rules || !impact) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/rules/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ impactToken: impact.impactToken, order: rules.map((rule, priority) => ({ id: rule.id, priority })) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Order could not be changed');
      setRules(null); setImpact(null); setReview(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Order could not be changed'); setImpact(null); setReview(false); }
    finally { setBusy(false); }
  }
  return <section style={{ marginBottom: 12, color: '#40454a', fontSize: 12 }} aria-label="Decision order preview">
    {!rules ? <button type="button" disabled={busy} onClick={() => void open()}>Review decision order</button> : <>
      <p>First matching rule wins. Move published rules, preview the complete policy, then review the new order.</p>
      <ol>{rules.map((rule, index) => <li key={rule.id} style={{ marginBottom: 8 }}>{rule.name} <button type="button" aria-label={`Move ${rule.name} earlier`} disabled={busy || index === 0} onClick={() => move(index, -1)}>Earlier</button> <button type="button" aria-label={`Move ${rule.name} later`} disabled={busy || index === rules.length - 1} onClick={() => move(index, 1)}>Later</button></li>)}</ol>
      {rules.length ? <RuleImpactPreview endpoint="/api/rules/reorder/preview" proposal={{ contractVersion: 2, orderedRuleIds: rules.map(rule => rule.id) }} disabled={busy} onPreview={value => { setImpact(value); setReview(false); }} /> : <p>No published rules to reorder.</p>}
      {review ? <div role="region" aria-label="Confirm policy order"><p>Confirm the numbered order above for future recommendations in this workspace. This records a configuration audit event. Existing decisions remain unchanged.</p><button type="button" disabled={busy || !impact} onClick={() => void confirm()}>{busy ? 'Saving…' : 'Confirm decision order'}</button></div> : <button type="button" disabled={!impact || busy} onClick={() => setReview(true)}>Review new order</button>}
      <button type="button" disabled={busy} onClick={() => { setRules(null); setImpact(null); setReview(false); }}>Cancel</button>
    </>}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
