'use client';

import { CheckCircle2, CircleAlert, RefreshCw, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';
import { Badge, Bone, Button, Panel, Select, StatusBadge } from '@/components/ui';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import { countLabel, label } from '@/lib/ui/labels';
import { formatDateTime, parseMajorUnitInput } from '@/lib/utils/format';
import { SourceTraceRow } from '@/components/authenticated/SourceTraceRow';

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
  merchant_rule_version_id?: string | null;
  policy_snapshot?: { rule_name?: string | null; version?: string | null } | null;
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

type EvidenceFact = {
  id: string;
  factKind?: 'source_fact' | 'human_finding' | 'inference';
  evidenceType?: string;
  sourceProvider?: string;
  externalReference?: string | null;
  occurredAt?: string | null;
  collectedAt?: string | null;
  freshness?: string;
  summary?: string | null;
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
    input?: { facts?: EvidenceFact[] };
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

const FACT_KIND_COPY = {
  source_fact: {
    label: 'Source facts',
    description: 'Provider records retained with their original source and timestamp.',
  },
  human_finding: {
    label: 'Human findings',
    description: 'Merchant-recorded observations that remain distinct from provider facts.',
  },
  inference: {
    label: 'Inferences',
    description: 'System interpretation that remains advisory and traceable to its inputs.',
  },
} as const;

const CASE_EVIDENCE_TIMEOUT_MS = 8_000;

function tone(state?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'known') return 'success';
  if (state === 'likely') return 'warning';
  if (state === 'blocked') return 'danger';
  return 'neutral';
}

function stateLabel(state?: string) {
  const reconciliationStates: Record<string, string> = {
    known: 'Known',
    likely: 'Likely',
    unresolved: 'Unresolved',
    not_applicable: 'Not applicable',
    blocked: 'Blocked',
    not_evaluated: 'Not evaluated',
  };
  return reconciliationStates[state ?? 'not_evaluated']
    ?? label('assessmentState', state ?? 'not_evaluated');
}

function requestKey(scope: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${random}`;
}

function humanize(value: string | null | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  return value.replaceAll('_', ' ');
}

async function fetchCaseEvidence(url: string, parentSignal?: AbortSignal): Promise<ReconciliationPayload> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CASE_EVIDENCE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `Evidence request failed (${response.status}).`);
    }
    return response.json() as Promise<ReconciliationPayload>;
  } catch (caught) {
    if (timedOut) {
      throw new Error('Case evidence took too long to load.');
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

export function ReconciliationSummaryCard({
  caseId,
  currency = 'GBP',
  canManage = false,
  requiredContextReady = true,
  evidenceStrength,
  nextAction,
  nextActionReason,
  onRefresh,
}: {
  caseId: string;
  currency?: string | null;
  canManage?: boolean;
  requiredContextReady?: boolean;
  evidenceStrength?: string;
  nextAction?: string;
  nextActionReason?: string;
  onRefresh?: () => void;
}) {
  const evidenceUrl = `/api/claims/${encodeURIComponent(caseId)}/matches`;
  const { data, loading, isRefreshing, error, reload } = useAsyncResource<ReconciliationPayload>(
    evidenceUrl,
    (signal) => fetchCaseEvidence(evidenceUrl, signal),
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
  const facts = data?.reconciliation?.input?.facts ?? [];
  const factsByKind = {
    source_fact: facts.filter((fact) => (fact.factKind ?? 'source_fact') === 'source_fact'),
    human_finding: facts.filter((fact) => fact.factKind === 'human_finding'),
    inference: facts.filter((fact) => fact.factKind === 'inference'),
  };
  const namedGaps = new Set(
    rows.flatMap(([, recommendation]) => recommendation.missing_evidence ?? []),
  );
  /*
   * Independent recommendations are meant to read as independent — body copy
   * that is byte-identical across cards signals unfilled placeholder, not an
   * agreement worth stating three times (§3.1 T2). Suppress it structurally.
   */
  const explanationCounts = new Map<string, number>();
  rows.forEach(([, recommendation]) => {
    const text = (recommendation.explanation ?? 'Review the evidence before acting.').trim();
    explanationCounts.set(text, (explanationCounts.get(text) ?? 0) + 1);
  });
  const readiness = loading && !data
    ? 'Loading evidence'
    : error && !data
      ? 'Unavailable — retry'
      : evidenceStrength
        ? label('evidenceStrength', evidenceStrength)
        : facts.length > 0
          ? 'Evidence loaded'
          : 'Not yet evaluated';
  const canMutate =
    canManage && requiredContextReady && data?.permissions?.can_mutate !== false;

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
      setMessage('Recommendations updated from the current evidence.');
      reload();
      onRefresh?.();
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
      setMessage('Claimed item matched. Recommendations updated.');
      reload();
      onRefresh?.();
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
    const amountMinor = parseMajorUnitInput(outcomeAmount, currency);
    if (outcomeAmount.trim() && amountMinor == null) {
      setMessage(`Enter a valid amount in ${currency?.toUpperCase() ?? 'the case currency'}.`);
      setBusy(false);
      return;
    }
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
          amount_minor: Number.isInteger(amountMinor) && amountMinor != null && amountMinor >= 0 ? amountMinor : null,
          currency: currency?.toUpperCase() ?? null,
          followed_recommendation: null,
        }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? 'Outcome could not be recorded.');
      setOutcomeAmount('');
      setMessage('Merchant-confirmed outcome recorded. Unauth will keep it separate from source-observed outcomes.');
      reload();
      onRefresh?.();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Outcome could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      as="section"
      variant="panel"
      className="overflow-hidden p-0"
      aria-labelledby="case-evidence-readiness-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShieldQuestion className="mt-0.5 shrink-0 text-[var(--ua-action-primary)]" size={19} aria-hidden="true" />
          <div>
            <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-secondary)]">
              Decision evidence
            </p>
            <h3 id="case-evidence-readiness-title" className="ua-text-section-title mt-1 text-[var(--ua-text-primary)]">
              Evidence and readiness
            </h3>
            <p className="ua-text-caption-role mt-1 max-w-2xl leading-relaxed">
              Follow the source record through verified facts and recommendations before recording a merchant decision.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {evidenceStrength ? (
            <StatusBadge family="evidenceStrength" value={evidenceStrength} />
          ) : null}
          {canMutate ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leadingIcon={<RefreshCw />}
              loading={busy || isRefreshing}
              disabled={loading || Boolean(error && !data)}
              aria-label="Update recommendations"
              onClick={() => void reconcile()}
            >
              Update recommendations
            </Button>
          ) : (
            <p className="max-w-44 text-right text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
              {!canManage
                ? 'Read-only access: recommendations cannot be updated.'
                : !requiredContextReady
                  ? 'Recommendation updates unavailable.'
                  : 'Source permissions do not allow recommendation updates.'}
            </p>
          )}
        </div>
      </div>

      <dl className="grid border-t border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)] sm:grid-cols-2 lg:grid-cols-4" aria-label="Evidence readiness summary">
        <div className="p-3.5 lg:border-r lg:border-[var(--ua-border-subtle)]">
          <dt className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Evidence readiness</dt>
          <dd className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">{readiness}</dd>
        </div>
        <div className="border-t border-[var(--ua-border-subtle)] p-3.5 sm:border-l sm:border-t-0 lg:border-l-0 lg:border-r">
          <dt className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Provenance</dt>
          <dd className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">
            {loading && !data
              ? 'Loading…'
              : error && !data
                ? 'Unavailable'
                : countLabel(facts.length, 'fact')}
          </dd>
        </div>
        <div className="border-t border-[var(--ua-border-subtle)] p-3.5 lg:border-r">
          <dt className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Named gaps</dt>
          <dd className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">
            {loading && !data
              ? 'Not yet evaluated'
              : error && !data
                ? 'Not yet evaluated'
              : namedGaps.size === 0
                ? 'No named gaps'
                : countLabel(namedGaps.size, 'gap')}
          </dd>
        </div>
        <div className="border-t border-[var(--ua-border-subtle)] p-3.5 sm:border-l lg:border-l-0">
          <dt className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Next action</dt>
          <dd className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">
            {nextAction ?? rows[0]?.[1].headline ?? 'Review source evidence'}
          </dd>
          {nextActionReason ? <p className="ua-text-caption-role mt-1">{nextActionReason}</p> : null}
        </div>
      </dl>

      {loading && !data ? (
        <div className="space-y-3 border-t border-[var(--ua-border-subtle)] p-4" aria-label="Loading evidence and recommendations">
          <Bone className="h-36" />
          <p className="sr-only" role="status">Loading case evidence</p>
        </div>
      ) : error && !data ? (
        <div className="border-t border-[var(--ua-border-subtle)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ua-radius-control)] border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3" role="alert">
            <div className="flex min-w-0 items-start gap-2">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-[var(--ua-risk-critical)]" aria-hidden="true" />
              <div>
                <p className="ua-text-working-title text-[var(--ua-risk-critical)]">Case evidence could not be loaded</p>
                <p className="ua-text-caption-role mt-1">
                  {error} No recommendation or merchant decision was changed.
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={reload}>
              Retry evidence
            </Button>
          </div>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--ua-radius-control)] border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3" role="status">
              <p className="ua-text-caption-role">
                The last loaded evidence remains visible. Refresh failed: {error}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={reload}>Retry</Button>
            </div>
          ) : null}

          <div className="border-t border-[var(--ua-border-subtle)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h4 className="ua-text-working-title text-[var(--ua-text-primary)]">Independent recommendations</h4>
                <p className="ua-text-caption-role mt-1">
                  Customer action, responsibility, and recovery stay separate. The merchant makes the final decision.
                </p>
              </div>
              {isRefreshing ? <span role="status" className="ua-text-caption-role">Updating…</span> : null}
            </div>
            {rows.length > 0 ? (
              <div className="mt-3 grid divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
                {rows.map(([key, recommendation]) => {
                  const explanationText = (recommendation.explanation ?? 'Review the evidence before acting.').trim();
                  const showExplanation = (explanationCounts.get(explanationText) ?? 0) <= 1;
                  return (
                    <div key={key} className="min-w-0 px-3 py-3 first:pl-0 last:pr-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="ua-text-label">{labels[key] ?? key}</p>
                        <Badge tone={tone(recommendation.assessment_state)} size="sm" dot>
                          {stateLabel(recommendation.assessment_state)}
                        </Badge>
                      </div>
                      <p className="ua-text-working-title mt-2 text-[var(--ua-text-primary)]">{recommendation.headline ?? 'No recommendation yet'}</p>
                      {showExplanation ? (
                        <p className="ua-text-caption-role mt-1 leading-5">{explanationText}</p>
                      ) : null}
                      {recommendation.missing_evidence && recommendation.missing_evidence.length > 0 ? (
                        <p className="ua-text-metadata mt-2">
                          Missing: {recommendation.missing_evidence.slice(0, 3).map((item) => humanize(item, item)).join(', ')}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ua-text-body mt-3 text-[var(--ua-text-secondary)]">
                Select the affected item to calculate recommendations from the order and source evidence.
              </p>
            )}
          </div>

          <div className="border-t border-[var(--ua-border-subtle)] p-4">
            <div>
              <h4 className="ua-text-working-title text-[var(--ua-text-primary)]">Evidence spine</h4>
              <p className="ua-text-caption-role mt-1">
                Labels and provenance distinguish what a provider reported, what a person found, and what the system inferred.
              </p>
            </div>
            {facts.length > 0 ? (
              <div className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
                {(Object.keys(FACT_KIND_COPY) as Array<keyof typeof FACT_KIND_COPY>).map((kind) => {
                  const kindFacts = factsByKind[kind];
                  if (kindFacts.length === 0) return null;
                  const copy = FACT_KIND_COPY[kind];
                  return (
                    <section key={kind} className="grid gap-3 py-3 md:grid-cols-[180px_minmax(0,1fr)]" data-evidence-kind={kind}>
                      <div>
                        <h5 className="ua-text-metadata text-[var(--ua-text-primary)]">{copy.label}</h5>
                        <p className="mt-1 text-[length:var(--ua-text-metadata-size)] leading-4 text-[var(--ua-text-tertiary)]">{copy.description}</p>
                      </div>
                      <div>
                        {kindFacts.slice(0, 8).map((fact) => (
                          <SourceTraceRow
                            key={fact.id}
                            kind={`Provider record · ${humanize(fact.sourceProvider, 'Unknown provider')}`}
                            summary={<p className="font-medium text-[var(--ua-text-primary)]">
                              {fact.summary ?? humanize(fact.evidenceType, 'Evidence item')}
                            </p>}
                            meta={<>
                              {fact.externalReference ? `Ref ${fact.externalReference}` : ''}
                              {fact.occurredAt || fact.collectedAt
                                ? ` · ${formatDateTime(fact.occurredAt ?? fact.collectedAt ?? '')}`
                                : ''}
                              {fact.freshness ? ` · ${humanize(fact.freshness, 'Freshness unknown')}` : ''}
                            </>}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <p className="ua-text-body mt-3 text-[var(--ua-text-secondary)]">
                No canonical evidence facts are on file yet. Missing evidence remains explicit rather than being inferred from silence.
              </p>
            )}
          </div>
        </>
      )}

      {data ? (
        <>
      {rows.length > 0 ? (() => {
        const appliedRule = rows
          .map(([, recommendation]) => recommendation)
          .find((recommendation) => recommendation.policy_snapshot?.rule_name || recommendation.merchant_rule_version_id);
        if (!appliedRule) return null;
        return (
          <div className="ua-text-dense border-t border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-4 py-3">
            <span className="font-semibold text-[var(--ua-text-secondary)]">Applied rule: </span>
            <span className="font-medium text-[var(--ua-text-primary)]">
              {appliedRule.policy_snapshot?.rule_name ?? 'Merchant policy'}
            </span>
            <span className="text-[var(--ua-text-secondary)]">
              {' · '}Version {appliedRule.policy_snapshot?.version ?? appliedRule.merchant_rule_version_id?.slice(-6) ?? 'recorded'}
            </span>
          </div>
        );
      })() : null}

      {claimedItems.length === 0 && candidates.length > 0 ? (
        <div className="border-t border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4">
          <p className="ua-text-label">Order-line candidates</p>
          <p className="ua-text-metadata mt-1">Select the item the customer says is affected. Unauth will not infer this from an order-level refund.</p>
          <div className="mt-2 space-y-2">
            {candidates.slice(0, 8).map((line) => (
              <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] px-3 py-2">
                <div className="min-w-0">
                  <p className="ua-text-working-title truncate text-[var(--ua-text-primary)]">{line.title ?? line.sku ?? 'Unnamed item'}</p>
                  <p className="ua-text-metadata">{line.sku ?? 'No SKU'} · Qty {line.quantity ?? 1}</p>
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
        <div className="border-t border-[var(--ua-border-subtle)] p-4">
          <p className="ua-text-label">Item × parcel reconciliation</p>
          <div className="mt-2 space-y-1.5">
            {matrix.slice(0, 12).map((row, index) => (
              <div key={`${row.claimedItemId ?? 'item'}-${row.parcelId ?? 'unassigned'}-${index}`} className="ua-text-dense flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ua-border-subtle)] px-3 py-2">
                <span className="font-medium text-[var(--ua-text-primary)]">{row.claimedSku ?? 'Claimed item'}</span>
                <span className="text-[var(--ua-text-secondary)]">{row.parcelId ? `Parcel ${row.parcelId.slice(-6)}` : 'No parcel record'} · {label('workflowStatus', row.state ?? 'unknown')}</span>
                <Badge tone={row.physicalProof ? 'success' : 'warning'} size="sm" dot>{row.physicalProof ? 'Physical proof' : 'System record only'}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="ua-text-label">Customer outcome</p>
            <p className="ua-text-metadata mt-1">Record a merchant confirmation when the source system cannot yet report the result. This does not execute a refund or reship.</p>
          </div>
          {outcomes.length > 0 ? <Badge size="sm">{countLabel(outcomes.length, 'outcome')} recorded</Badge> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="ua-text-label min-w-44 font-medium">
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
          <label className="ua-text-label w-32 font-medium">
            Amount
            <input
              className="ua-text-body mt-1 h-9 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2 text-[var(--ua-text-primary)]"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={outcomeAmount}
              onChange={(event) => setOutcomeAmount(event.target.value)}
              disabled={!canMutate || busy}
              placeholder="Optional"
              aria-describedby="case-outcome-amount-hint"
            />
            <span id="case-outcome-amount-hint" className="mt-1 block text-[length:var(--ua-text-metadata-size)] font-normal text-[var(--ua-text-tertiary)]">
              Enter {currency?.toUpperCase() ?? 'the case currency'} in major units.
            </span>
          </label>
          <Button type="button" size="sm" variant="secondary" disabled={!canMutate || busy} loading={busy} onClick={() => void recordOutcome()}>
            Record outcome
          </Button>
        </div>
      </div>

      {message ? (
        <p role="status" className="ua-text-caption-role flex items-center gap-1.5 border-t border-[var(--ua-border-subtle)] px-4 py-3">
          <CheckCircle2 size={14} aria-hidden="true" /> {message}
        </p>
      ) : null}
        </>
      ) : null}
    </Panel>
  );
}
