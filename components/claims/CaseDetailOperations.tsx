'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CaseComments } from '@/components/collaboration/CaseComments';
import { ClaimReviewManageCard } from '@/components/claims/ClaimReviewManageCard';
import { ClaimReviewToast } from '@/components/claims/ClaimReviewToast';
import { CaseInvestigationsCard } from '@/components/claims/investigations/CaseInvestigationsCard';
import {
  CaseFinancialHistoryCard,
  type CaseFinancialSummary,
} from '@/components/claims/payout/CaseFinancialHistoryCard';
import { ReconciliationSummaryCard } from '@/components/claims/payout/ReconciliationSummaryCard';
import type { CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { Decision } from '@/components/claims/claimReviewTypes';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import { BeforeYouConfirm, Drawer, Modal } from '@/components/ui';
import {
  formatDateAbsolute,
  formatDateTime,
  formatMinorCurrencyNullable,
} from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import { formatMajorUnitInput } from '@/lib/ui/merchantCopy';
import {
  ActivityTimeline,
  CaseFileUnavailable,
  CaseTruthStrip,
  ClaimGates,
  CustodyChainCard,
  EvidenceRegisterCard,
  ItemParcelMatrixCard,
  RecoveryOutcomeCard,
  ResponsibilityCard,
} from './case-file/CaseFileSections';
import styles from './CaseDetailOperations.module.css';

type DetailTab = 'evidence' | 'responsibility' | 'recovery' | 'activity';

const TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'evidence', label: 'Evidence' },
  { key: 'responsibility', label: 'Responsibility' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'activity', label: 'Activity' },
];

function tabFromUrl(value: string | null): DetailTab {
  return TABS.some((tab) => tab.key === value)
    ? value as DetailTab
    : 'evidence';
}

function human(value: string | null | undefined, fallback = 'Unavailable') {
  if (!value?.trim()) return fallback;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ADVISORY_RECOMMENDATION_LABELS: Record<string, string> = {
  approve_payout: 'Recommend payout authorisation',
  deny_under_policy: 'Recommend denial under policy',
  request_customer_evidence: 'Recommend collecting customer evidence',
  ask_carrier_for_clarification: 'Recommend asking the carrier for clarification',
  ask_3pl_for_clarification: 'Recommend asking the 3PL for clarification',
  ask_supplier_for_clarification: 'Recommend asking the supplier for clarification',
  escalate_internal_review: 'Recommend internal escalation',
  open_recovery: 'Recommend opening recovery',
  wait_for_response: 'Recommend waiting for the response',
  close_case: 'Recommend closing the case',
  request_evidence: 'Recommend collecting evidence',
};

function advisoryRecommendationLabel(value: string): string {
  return ADVISORY_RECOMMENDATION_LABELS[value]
    ?? `Recommend ${value.replaceAll('_', ' ').toLowerCase()}`;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function amount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeProviderHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.myshopify.com')
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function normaliseInvestigationId(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })().trim();
  return decoded && decoded.length <= 200 && /^[a-zA-Z0-9_-]+$/.test(decoded)
    ? decoded
    : null;
}

function backLabel(href: string) {
  if (href.startsWith('/work')) return 'Back to work';
  if (href.startsWith('/cases')) return 'Back to cases';
  return 'Back';
}

function caseHref(caseId: string, returnHref: string, tab: DetailTab) {
  const params = new URLSearchParams({ tab });
  if (returnHref !== '/cases') params.set('return', returnHref);
  return `/cases/${encodeURIComponent(caseId)}?${params.toString()}`;
}

function nextCaseHref(href: string | null | undefined, returnHref: string) {
  if (!href) return null;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}return=${encodeURIComponent(returnHref)}`;
}

function responsibilityValue(file: CaseEvidenceFile) {
  const owner = file.apparentResponsibility.owner;
  const attribution = owner === 'courier'
    ? 'carrier_loss'
    : owner === 'three_pl'
      ? 'warehouse_missing_item'
      : owner === 'merchant'
        ? 'merchant_policy'
        : 'unknown';
  const confidence = file.apparentResponsibility.confidence === 'known'
    ? 'high'
    : file.apparentResponsibility.confidence === 'likely'
      ? 'medium'
      : 'needs_more_evidence';
  const recoveryOwner = owner === 'courier'
    ? 'carrier'
    : owner === 'three_pl'
      ? 'three_pl'
      : owner === 'merchant'
        ? 'merchant'
        : 'unknown';
  const recoverability = file.providerClaimReadiness.readiness === 'ready_to_submit'
    ? 'recoverable'
    : owner === 'none_established'
      ? 'not_recoverable'
      : 'needs_more_evidence';
  return { attribution, confidence, recoveryOwner, recoverability };
}

function ResponsibilityConfirmation({
  open,
  onClose,
  file,
  wb,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  file: CaseEvidenceFile | null;
  wb: ClaimReviewWorkbench;
  canManage: boolean;
}) {
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!file) return null;
  const caseFile = file;
  const values = responsibilityValue(caseFile);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(caseFile.claim.id)}/responsibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `responsibility:${caseFile.claim.id}:${Date.now()}`,
        },
        body: JSON.stringify({
          expected_version: Number((wb.decisionData?.payoutCase as { state_version?: number } | undefined)?.state_version ?? 1),
          loss_attribution: values.attribution,
          attribution_confidence: values.confidence,
          recovery_owner: values.recoveryOwner,
          recoverability: values.recoverability,
          supporting_evidence_ids: caseFile.apparentResponsibility.supportingEvidenceIds,
          conflicting_evidence_ids: caseFile.apparentResponsibility.conflictingEvidenceIds,
          rationale: rationale.trim() || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Responsibility confirmation failed.');
      onClose();
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Responsibility confirmation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm apparent responsibility"
      overlayId="responsibility-confirm"
      actions={[{
        label: busy ? 'Recording…' : 'Confirm responsibility',
        variant: 'primary',
        disabled: busy || !canManage,
        onClick: () => void confirm(),
      }]}
    >
      <BeforeYouConfirm
        objectSummary={`Case ${file.claim.id} · ${file.claim.issueSummary}`}
        valueSummary={file.claim.amountAtRiskMinor != null
          ? formatMinorCurrencyNullable(file.claim.amountAtRiskMinor, file.claim.currency)
          : 'Exposure unavailable'}
        externalAction="Records a merchant responsibility decision only. It does not submit a provider claim or move money."
        reversible="A correction is recorded as a new append-only decision."
        appendOnly="Attribution, confidence, cited evidence, rationale, actor, and timestamp."
      />
      <div className={styles.confirmSummary}>
        <strong>{file.apparentResponsibility.headline}</strong>
        <span>
          Mapped to {values.attribution} · recovery owner {values.recoveryOwner} · {values.confidence}
        </span>
        <textarea
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          placeholder="Rationale (recommended when evidence is contested)"
          aria-label="Responsibility rationale"
        />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </Modal>
  );
}

function DecisionActionChain({
  wb,
  file,
  financialSummaries,
}: {
  wb: ClaimReviewWorkbench;
  file: CaseEvidenceFile | null;
  financialSummaries: CaseFinancialSummary[];
}) {
  const payoutCase = object(wb.decisionData?.payoutCase);
  const recommendation = text(payoutCase.nextAction);
  const recommendationReason = text(payoutCase.nextActionReason);
  const latestDecision = file?.decisions[0] ?? null;
  const latestLegacyDecision = wb.latestOutcome ?? null;
  const latestAction = file?.externalActions.find((entry) => entry.capabilityId === 'refund.manual_handoff')
    ?? file?.externalActions[0]
    ?? null;
  const actionPayload = object(latestAction?.payload);
  const provider = object(actionPayload.provider);
  const sourceObject = object(actionPayload.source_object);
  const providerHref = safeProviderHref(sourceObject.provider_href);
  const actionAmount = amount(actionPayload.amount_minor);
  const latestOutcome = file?.outcomes[0] ?? null;
  const paidSummaries = financialSummaries.filter((summary) => summary.known_states.includes('paid'));
  const paidValue = paidSummaries.length
    ? paidSummaries.map((summary) => formatMinorCurrencyNullable(summary.paid_minor, summary.currency)).join(' · ')
    : null;
  const refundDecision = latestDecision
    ? ['approved', 'partial_refund', 'full_refund'].includes(latestDecision.decision)
    : ['approved', 'partial_refund', 'full_refund'].includes(latestLegacyDecision?.decision ?? '');

  return (
    <section className={styles.operatingChain} aria-labelledby="decision-action-chain-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Operating chain</span>
          <h2 id="decision-action-chain-title">Recommendation → decision → external result → money</h2>
        </div>
        <p>Each authority is recorded separately. Later evidence never rewrites an earlier record.</p>
      </div>
      <ol className={styles.chainGrid}>
        <li data-authority="recommendation" data-state={recommendation ? (wb.decisionStale ? 'warning' : 'recorded') : 'unavailable'}>
          <span>1 · Advisory recommendation</span>
          <strong>{recommendation ? advisoryRecommendationLabel(recommendation) : 'Unavailable'}</strong>
          <small>{recommendationReason ?? 'No current recommendation is available.'}</small>
          {wb.decisionStale ? <em>Facts changed after evaluation</em> : null}
        </li>
        <li data-authority="merchant-decision" data-state={latestDecision || latestLegacyDecision ? 'recorded' : 'unavailable'}>
          <span>2 · Merchant decision</span>
          <strong>
            {latestDecision
              ? DECISION_LABELS[latestDecision.decision as Decision] ?? human(latestDecision.decision)
              : latestLegacyDecision
                ? DECISION_LABELS[latestLegacyDecision.decision as Decision] ?? human(latestLegacyDecision.decision)
                : 'Not recorded'}
          </strong>
          <small>
            {latestDecision?.amountMinor != null
              ? `${formatMinorCurrencyNullable(latestDecision.amountMinor, latestDecision.currency)} authorised · ${latestDecision.effectiveAt ? formatDateTime(latestDecision.effectiveAt) : 'time unavailable'}`
              : 'An internal authorisation is not a provider result.'}
          </small>
        </li>
        <li data-authority="external-action" data-state={latestAction?.status === 'failed' ? 'critical' : latestAction ? 'warning' : 'unavailable'}>
          <span>3 · Assisted provider handoff</span>
          <strong>{latestAction ? human(latestAction.status) : refundDecision ? 'Handoff unavailable' : 'Not applicable yet'}</strong>
          <small>
            {latestAction
              ? `${human(text(provider.id), 'Provider')} · ${human(text(actionPayload.scope), 'Scope unavailable')} · order ${text(sourceObject.reference) ?? latestAction.externalRecordId}`
              : refundDecision
                ? 'No exact provider instruction is on file. No external success is inferred.'
                : 'A refund authorisation prepares this only when the exact verified source can be resolved.'}
          </small>
          {actionAmount != null ? (
            <em>{formatMinorCurrencyNullable(actionAmount, text(actionPayload.currency))} handoff value</em>
          ) : null}
          {providerHref ? (
            <a href={providerHref} target="_blank" rel="noopener noreferrer">
              Open exact Shopify order <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : null}
        </li>
        <li data-authority="source-outcome" data-state={latestOutcome?.state === 'observed_failed' ? 'critical' : latestOutcome ? 'recorded' : 'unavailable'}>
          <span>4 · External outcome</span>
          <strong>{latestOutcome ? human(latestOutcome.state) : 'Not observed'}</strong>
          <small>
            {latestOutcome
              ? `${human(latestOutcome.outcomeType)} · ${human(latestOutcome.sourceSystem)} · ${latestOutcome.sourceExternalId ? `ref ${latestOutcome.sourceExternalId}` : 'reference unavailable'}`
              : 'A decision or handoff never stands in for a source result.'}
          </small>
        </li>
        <li data-authority="ledger" data-state={paidValue ? 'recorded' : 'unavailable'}>
          <span>5 · Financial stage</span>
          <strong>{paidValue ?? 'Paid value not recorded'}</strong>
          <small>
            {paidValue
              ? 'A paid stage is present in the source-linked financial projection.'
              : 'Missing paid evidence remains unavailable; authorised value is not shown as paid.'}
          </small>
        </li>
      </ol>
    </section>
  );
}

function PreviousCases({
  wb,
  currentCaseId,
  returnHref,
  tab,
}: {
  wb: ClaimReviewWorkbench;
  currentCaseId: string;
  returnHref: string;
  tab: DetailTab;
}) {
  const previous = wb.history.filter((entry) => entry.id !== currentCaseId);
  if (!previous.length) return null;
  return (
    <section className={styles.previousCases} aria-labelledby="previous-cases-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Customer context</span>
          <h2 id="previous-cases-title">Previous cases</h2>
        </div>
        <Link href={`${wb.customerProfileHref}#cases`}>View complete customer history</Link>
      </div>
      <ul>
        {previous.slice(0, 8).map((entry) => (
          <li key={entry.id}>
            <Link href={caseHref(entry.id, returnHref, tab)}>
              <strong>CASE-{hashId(entry.id).replace('#', '')}</strong>
              <span>{CLAIM_TYPE_LABELS[entry.claim_type ?? ''] ?? human(entry.claim_type, 'Case')}</span>
              <small>{STATUS_LABELS[entry.status] ?? human(entry.status)}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseDetailOperations({
  wb,
  financialSummaries,
  canManage,
  caseBackHref = '/cases',
  initialTab,
  investigationId,
  caseEvidenceFile,
}: {
  wb: ClaimReviewWorkbench;
  financialSummaries: CaseFinancialSummary[];
  canManage: boolean;
  caseBackHref?: string;
  initialTab?: DetailTab | null;
  investigationId?: string | null;
  caseEvidenceFile?: CaseEvidenceFile | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'evidence');
  const [focusedInvestigationId, setFocusedInvestigationId] = useState<string | null>(
    normaliseInvestigationId(investigationId),
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [responsibilityOpen, setResponsibilityOpen] = useState(false);
  const claim = wb.selectedClaim;
  const file = caseEvidenceFile ?? null;
  const contextStatus = wb.decisionLoading && !wb.decisionData
    ? 'loading'
    : wb.decisionError || !wb.decisionData
      ? 'unavailable'
      : 'ready';
  const customerName = file?.claim.customerName ?? wb.customerName ?? claim?.customer_name ?? 'Customer';
  const caseType = claim?.claim_type
    ? CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type.replaceAll('_', ' ')
    : file?.claim.claimType ?? 'case';
  const openedAt = file?.claim.createdAt ?? claim?.submitted_at ?? claim?.created_at ?? null;
  const exposureMinor = file?.claim.amountAtRiskMinor ?? null;
  const currency = file?.claim.currency ?? claim?.currency ?? null;
  const nextReview = nextCaseHref(wb.state.nextClaimHref, caseBackHref);

  useEffect(() => {
    function sync(fallback: string | null = null) {
      const url = new URL(window.location.href);
      const hashInvestigationId = url.hash.startsWith('#investigation-')
        ? url.hash.slice('#investigation-'.length)
        : null;
      const focus = normaliseInvestigationId(url.searchParams.get('investigationId') ?? hashInvestigationId ?? fallback);
      setFocusedInvestigationId(focus);
      const nextTab = focus ? 'responsibility' : tabFromUrl(url.searchParams.get('tab'));
      setTab(nextTab);
      if (focus && url.searchParams.get('tab') !== 'responsibility') {
        url.searchParams.set('tab', 'responsibility');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
    sync(investigationId ?? null);
    const onNavigation = () => sync();
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);
    return () => {
      window.removeEventListener('popstate', onNavigation);
      window.removeEventListener('hashchange', onNavigation);
    };
  }, [investigationId]);

  function selectTab(next: DetailTab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    if (next !== 'responsibility') {
      url.searchParams.delete('investigationId');
      if (url.hash.startsWith('#investigation-')) url.hash = '';
      setFocusedInvestigationId(null);
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setTab(next);
  }

  function openDecision(decision: Decision) {
    const decisionAmount = exposureMinor != null && currency
      ? formatMajorUnitInput(exposureMinor, currency)
      : claim?.amount_at_risk != null
        ? String(claim.amount_at_risk)
        : '';
    wb.patch({
      decision,
      outcome: 'pending',
      decisionAmount,
      notes: wb.state.notes,
    });
    setManageOpen(true);
  }

  if (!claim) {
    return <div className={styles.loading} role="status">Loading case context…</div>;
  }

  return (
    <div className={styles.surface} data-state-id="case-evidence-truth">
      <ClaimReviewToast wb={wb} />

      <div className={styles.utilityRow}>
        <Link href={caseBackHref} className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" /> {backLabel(caseBackHref)}
        </Link>
        <div className={styles.utilityActions}>
          {wb.history.length > 1 ? (
            <label>
              <span className="sr-only">Switch case</span>
              <select
                aria-label="Switch case"
                value={claim.id}
                onChange={(event) => router.push(caseHref(event.target.value, caseBackHref, tab))}
              >
                {wb.history.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    CASE-{hashId(entry.id).replace('#', '')} · {STATUS_LABELS[entry.status] ?? entry.status}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Link href={wb.customerProfileHref}>Customer profile</Link>
          {nextReview ? <Link href={nextReview}>Open next review</Link> : null}
        </div>
      </div>

      <header className={styles.entityHeader}>
        <div className={styles.customerAvatar} aria-hidden="true">{initials(customerName)}</div>
        <div className={styles.entityIdentity}>
          <div className={styles.identityTopline}>
            <code>CASE-{hashId(claim.id).replace('#', '')}</code>
            <span className={styles.status}>{STATUS_LABELS[claim.status] ?? human(claim.status)}</span>
          </div>
          <h1>{customerName} — {String(caseType).toLowerCase()}</h1>
          <p>
            {openedAt ? `Opened ${formatDateAbsolute(openedAt)}` : 'Opened date unavailable'}
            {file?.claim.orderReference
              ? ` · Order ${file.claim.orderReference}`
              : claim.order_ref
                ? ` · Order ${claim.order_ref}`
                : ''}
            {exposureMinor != null && currency
              ? ` · ${formatMinorCurrencyNullable(exposureMinor, currency)} exposure`
              : claim.amount_at_risk != null && currency
                ? ` · ${claim.amount_at_risk} ${currency} source exposure`
                : ' · Exposure unavailable'}
          </p>
        </div>
      </header>

      {file ? (
        <CaseTruthStrip file={file} />
      ) : (
        <CaseFileUnavailable message="The case truth file could not be loaded. No evidence, responsibility, recovery, or money state is being inferred from another panel." />
      )}

      <nav className={styles.tabBar} aria-label="Case file tabs">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={styles.tabButton}
            data-active={tab === item.key ? 'true' : undefined}
            aria-current={tab === item.key ? 'page' : undefined}
            onClick={() => selectTab(item.key)}
          >
            {item.label}
            {item.key === 'evidence' && file ? (
              <span>{file.providerClaimReadiness.gates.filter((gate) => gate.state === 'met').length}/9</span>
            ) : null}
            {item.key === 'responsibility' && focusedInvestigationId ? <span>Focused</span> : null}
          </button>
        ))}
      </nav>

      <main className={styles.content}>
        {tab === 'evidence' ? (
          <>
            {file ? (
              <>
                <ClaimGates file={file} />
                <CustodyChainCard chain={file.custodyChain} firstFailure={file.firstEvidencedFailure} />
                <ItemParcelMatrixCard file={file} />
                <EvidenceRegisterCard file={file} />
              </>
            ) : null}
            <section className={styles.decisionRegion} id="merchant-decision" aria-labelledby="merchant-decision-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span>Merchant authority</span>
                  <h2 id="merchant-decision-title">Review and record the merchant decision</h2>
                </div>
                <p>Evidence and readiness above inform this internal decision. Recording it does not contact a provider, notify the customer, or move money.</p>
              </div>
              <div className={styles.decisionRegionActions}>
                <button type="button" data-primary="true" disabled={!canManage || contextStatus !== 'ready'} onClick={() => setManageOpen(true)}>
                  Review merchant decision
                </button>
                <button type="button" disabled={!canManage || contextStatus !== 'ready'} onClick={() => openDecision('full_refund')}>
                  Record refund authorisation
                </button>
                <details className={styles.decisionShortcuts}>
                  <summary>Expert decision shortcuts</summary>
                  <div>
                    <button type="button" data-tone="danger" disabled={!canManage} onClick={() => openDecision('denied')}>Record denial decision</button>
                    <button type="button" disabled={!canManage} onClick={() => openDecision('escalated')}>Record escalation</button>
                  </div>
                </details>
              </div>
              {contextStatus !== 'ready' ? <p className={styles.decisionUnavailable} role="status">Decision context is unavailable. No action is enabled until the current evidence and permissions load successfully.</p> : null}
            </section>
            <DecisionActionChain wb={wb} file={file} financialSummaries={financialSummaries} />
            <ReconciliationSummaryCard
              caseId={claim.id}
              currency={currency}
              canManage={canManage}
              requiredContextReady={contextStatus === 'ready'}
              onRefresh={wb.refreshRecommendation}
            />
          </>
        ) : tab === 'responsibility' ? (
          <>
            {file ? <ResponsibilityCard file={file} onConfirm={() => setResponsibilityOpen(true)} /> : null}
            <CaseInvestigationsCard
              caseId={claim.id}
              canManage={canManage}
              onRecommendationRefresh={wb.refreshRecommendation}
              focusedInvestigationId={focusedInvestigationId}
            />
          </>
        ) : tab === 'recovery' ? (
          <>
            {file ? <RecoveryOutcomeCard file={file} canManage={canManage} onRefresh={() => router.refresh()} /> : null}
            <CaseFinancialHistoryCard summaries={financialSummaries} />
          </>
        ) : (
          <>
            {file ? <ActivityTimeline file={file} /> : null}
            {file?.availability.errors.length ? (
              <section className={styles.availabilityNotice} role="status">
                <strong>Some audit sources are unavailable</strong>
                <ul>{file.availability.errors.map((error) => <li key={error}>{error}</li>)}</ul>
              </section>
            ) : null}
            <section className={styles.sourceContext} aria-labelledby="helpdesk-source-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span>Source context</span>
                  <h2 id="helpdesk-source-title">Helpdesk activity</h2>
                </div>
              </div>
              <SupportCaseContextList
                cases={wb.supportCases}
                bare
                emptyMessage="No linked helpdesk source activity is available for this case."
              />
            </section>
            <CaseComments caseId={claim.id} canComment={canManage} />
            <PreviousCases wb={wb} currentCaseId={claim.id} returnHref={caseBackHref} tab={tab} />
          </>
        )}
      </main>

      <Drawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        width={520}
        title="Record merchant decision"
        overlayId="case-decision-panel"
        signalRail
      >
        <div className={styles.drawerIntro}>
          <button type="button" aria-label="Close decision panel" onClick={() => setManageOpen(false)}>
            <X size={14} />
          </button>
          <p>
            This records an internal authorisation. A refund authorisation prepares an exact manual provider handoff when the verified source is available; it does not move money or notify a customer.
          </p>
        </div>
        <ClaimReviewManageCard
          wb={wb}
          canManage={canManage}
          contextStatus={contextStatus}
          onDecisionRecorded={() => {
            setManageOpen(false);
            router.refresh();
          }}
        />
      </Drawer>

      <ResponsibilityConfirmation
        open={responsibilityOpen}
        onClose={() => setResponsibilityOpen(false)}
        file={file}
        wb={wb}
        canManage={canManage}
      />
    </div>
  );
}
