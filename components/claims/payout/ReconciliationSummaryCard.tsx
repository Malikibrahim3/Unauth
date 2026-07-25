'use client';

import { CheckCircle2, CircleAlert, RefreshCw, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Panel, Select } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';

type Recommendation = {
  id?: string;
  recommendation_type?: string;
  result_code?: string;
  assessment_state?: string;
  headline?: string;
  explanation?: string;
  reason_codes?: string[];
  missing_evidence?: string[];
  generated_at?: string;
};

type MatrixRow = {
  claimedItemId?: string;
  parcelId?: string | null;
  claimedSku?: string | null;
  claimedQuantity?: number;
  recordedQuantity?: number;
  state?: string;
  physicalProof?: boolean;
  missingEvidence?: string[];
};

type ReconciliationPayload = {
  case_version?: number;
  order_lines?: Array<{
    id: string;
    sku?: string | null;
    variant_ref?: string | null;
    title?: string | null;
    quantity?: number | null;
  }>;
  claimed_items?: Array<{ id: string; claimed_title?: string | null; claimed_sku?: string | null }>;
  reconciliation?: {
    matrix?: MatrixRow[];
    outcomes?: Array<{ id: string; outcome_type?: string; state?: string; amount_minor?: number | null; currency?: string | null; observed_at?: string }>;
    recommendations?: {
      customerAction?: Recommendation | null;
      responsibility?: Recommendation | null;
      recovery?: Recommendation | null;
    };
  } | null;
  permissions?: { can_mutate?: boolean };
};

const labels: Record<string, string> = {
  customerAction: 'Customer action',
  responsibility: 'Responsibility',
  recovery: 'Recovery',
};

function tone(state?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'known') return 'success';
  if (state === 'likely') return 'warning';
  if (state === 'blocked') return 'danger';
  return 'neutral';
}

function stateLabel(state?: string) {
  if (!state) return 'Not evaluated';
  return state.replaceAll('_', ' ');
}

function requestKey(scope: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${random}`;
}

export function ReconciliationSummaryCard({
  caseId,
  currency = 'GBP',
  canManage = false,
}: {
  caseId: string;
  currency?: string | null;
  canManage?: boolean;
}) {
  const { data, loading, error, reload } = useFetchJson<ReconciliationPayload>(
    `/api/claims/${encodeURIComponent(caseId)}/matches`,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [outcomeType, setOutcomeType] = useState('no_payout');
  const [outcomeAmount, setOutcomeAmount] = useState('');

  const recommendations = data?.reconciliation?.recommendations ?? {};
  const rows = Object.entries(recommendations).filter(([, value]) => value) as Array<[string, Recommendation]>;
  const matrix = data?.reconciliation?.matrix ?? [];
  const outcomes = data?.reconciliation?.outcomes ?? [];
  const candidates = data?.order_lines ?? [];
  const claimedItems = data?.claimed_items ?? [];
  const canMutate = canManage && data?.permissions?.can_mutate !== false;

  async function reconcile() {
    if (!canMutate || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(caseId)}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey(`case-reconcile:${caseId}`),
        },
        body: JSON.stringify({ expected_version: data?.case_version ?? 1 }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? 'Reconciliation failed.');
      setMessage('Recommendations refreshed from the current evidence.');
      reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Reconciliation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function selectLine(lineId: string) {
    if (!canMutate || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(caseId)}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey(`case-item-match:${caseId}`),
        },
        body: JSON.stringify({ source_order_line_id: lineId, quantity: 1 }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? 'Item match could not be saved.');
      setMessage('Claimed item matched. Recommendations refreshed.');
      reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Item match could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function recordOutcome() {
    if (!canMutate || busy) return;
    setBusy(true);
    setMessage(null);
    const amount = outcomeAmount.trim() ? Number(outcomeAmount) : null;
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(caseId)}/outcomes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey(`case-outcome:${caseId}`),
        },
        body: JSON.stringify({
          outcome_type: outcomeType,
          state: 'merchant_confirmed',
          source_system: 'merchant_manual',
          amount_minor: Number.isInteger(amount) && amount != null && amount >= 0 ? amount : null,
          currency: currency?.toUpperCase() ?? null,
          followed_recommendation: null,
        }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? 'Outcome could not be recorded.');
      setOutcomeAmount('');
      setMessage('Merchant-confirmed outcome recorded. Unauth will keep it separate from source-observed outcomes.');
      reload();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Outcome could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel as="section" variant="panel" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldQuestion className="mt-0.5 shrink-0 text-[var(--ua-action-primary)]" size={19} aria-hidden="true" />
          <div>
            <p className="text-caption font-semibold text-[var(--ua-text-secondary)]">Evidence reconciliation</p>
            <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
              Three independent answers from the matched order, item, parcels, and source evidence.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leadingIcon={<RefreshCw />}
          loading={busy || loading}
          disabled={!canMutate}
          onClick={() => void reconcile()}
        >
          Refresh reconciliation
        </Button>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3 text-sm text-[var(--ua-risk-critical)]" role="alert">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Reconciliation is unavailable: {error}</span>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {rows.map(([key, recommendation]) => (
            <div key={key} className="rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--ua-text-secondary)]">{labels[key] ?? key}</p>
                <Badge tone={tone(recommendation.assessment_state)} size="sm" dot>
                  {stateLabel(recommendation.assessment_state)}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--ua-text-primary)]">{recommendation.headline ?? 'No recommendation yet'}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ua-text-secondary)]">{recommendation.explanation ?? 'Open the full case to review the evidence.'}</p>
              {recommendation.missing_evidence && recommendation.missing_evidence.length > 0 ? (
                <p className="mt-2 text-xs text-[var(--ua-text-tertiary)]">
                  Missing: {recommendation.missing_evidence.slice(0, 3).join(', ')}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ua-text-secondary)]">
          Match the claimed item first, then refresh to produce the three recommendations.
        </p>
      )}

      {claimedItems.length === 0 && candidates.length > 0 ? (
        <div className="mt-4 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
          <p className="text-xs font-semibold text-[var(--ua-text-secondary)]">Order-line candidates</p>
          <p className="mt-1 text-xs text-[var(--ua-text-tertiary)]">Select the item the customer says is affected. Unauth will not infer this from an order-level refund.</p>
          <div className="mt-2 space-y-2">
            {candidates.slice(0, 8).map((line) => (
              <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--ua-text-primary)]">{line.title ?? line.sku ?? 'Unnamed item'}</p>
                  <p className="text-xs text-[var(--ua-text-tertiary)]">{line.sku ?? 'No SKU'} · Qty {line.quantity ?? 1}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" disabled={!canMutate || busy} onClick={() => void selectLine(line.id)}>
                  Match item
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {matrix.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[var(--ua-text-secondary)]">Item × parcel reconciliation</p>
          <div className="mt-2 space-y-1.5">
            {matrix.slice(0, 12).map((row, index) => (
              <div key={`${row.claimedItemId ?? 'item'}-${row.parcelId ?? 'unassigned'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ua-border-subtle)] px-3 py-2 text-xs">
                <span className="font-medium text-[var(--ua-text-primary)]">{row.claimedSku ?? 'Claimed item'}</span>
                <span className="text-[var(--ua-text-secondary)]">{row.parcelId ? `Parcel ${row.parcelId.slice(-6)}` : 'No parcel record'} · {row.state?.replaceAll('_', ' ')}</span>
                <Badge tone={row.physicalProof ? 'success' : 'warning'} size="sm" dot>{row.physicalProof ? 'Physical proof' : 'System record only'}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ua-text-secondary)]">Customer outcome</p>
            <p className="mt-1 text-xs text-[var(--ua-text-tertiary)]">Record a merchant confirmation when the source system cannot yet report the result. This does not execute a refund or reship.</p>
          </div>
          {outcomes.length > 0 ? <Badge size="sm">{outcomes.length} recorded</Badge> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-44 text-xs font-medium text-[var(--ua-text-secondary)]">
            Outcome
            <Select className="mt-1" value={outcomeType} onChange={(event) => setOutcomeType(event.target.value)} disabled={!canMutate || busy}>
              <option value="no_payout">No payout</option>
              <option value="cash_refund">Cash refund</option>
              <option value="replacement">Replacement</option>
              <option value="store_credit">Store credit</option>
              <option value="goodwill_discount">Goodwill discount</option>
              <option value="other_manual_concession">Other concession</option>
            </Select>
          </label>
          <label className="w-32 text-xs font-medium text-[var(--ua-text-secondary)]">
            Amount (minor)
            <input
              className="mt-1 h-9 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2 text-sm text-[var(--ua-text-primary)]"
              type="number"
              min="0"
              step="1"
              value={outcomeAmount}
              onChange={(event) => setOutcomeAmount(event.target.value)}
              disabled={!canMutate || busy}
              placeholder="Optional"
            />
          </label>
          <Button type="button" size="sm" variant="secondary" disabled={!canMutate || busy} loading={busy} onClick={() => void recordOutcome()}>
            Record outcome
          </Button>
        </div>
      </div>

      {message ? (
        <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-[var(--ua-text-secondary)]">
          <CheckCircle2 size={14} aria-hidden="true" /> {message}
        </p>
      ) : null}
    </Panel>
  );
}
