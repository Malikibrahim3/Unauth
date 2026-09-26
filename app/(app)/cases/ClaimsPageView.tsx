import Link from '@/components/navigation/AppNavLink';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import {
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from './claimsPageData';
import { coverageForClaimsListView, type CasesSummary } from './claimsPageLogic';
import { ClaimsQueueClient } from './ClaimsQueueClient';
import type { ClaimsListView } from '@/lib/claims/claimsQueueUi';
import type { ClaimMetricCoverage, ClaimQueueCounts } from '@/lib/claims/queueCounts';
import { CasesQueueTabs } from './CasesQueueTabs';
import { CasesCompactFilters } from './CasesCompactFilters';
import type { CasesFlowSnapshot } from './casesFlow';
import { ManualCaseDialog } from './ManualCaseDialog';
import { buildClaimsQueryString } from './claimsPageLogic';
import { formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { ExactClaimsPageView } from './ExactClaimsPageView';
import { CasesFlowChart, casesFlowWindow } from './CasesFlowChart';

export type ClaimsFilterTab = {
  label: string;
  count: number;
  coverage: ClaimMetricCoverage;
  href: string;
  active: boolean;
};

export type ClaimsPageViewProps = {
  connectionState: ConnectionState;
  queueCounts: ClaimQueueCounts;
  coverageByMetric: Record<keyof ClaimQueueCounts, ClaimMetricCoverage>;
  aggregateCoverage: ClaimMetricCoverage;
  casesSummary: CasesSummary;
  casesFlow: CasesFlowSnapshot | null;
  isEmpty: boolean;
  resultText: string;
  pageSize: number;
  filterTabs: ClaimsFilterTab[];
  queueFilter: string;
  sp: Record<string, string | undefined>;
  searchTerm: string;
  slaFilter: string | null;
  claims: ClaimRow[];
  listView: ClaimsListView;
  latestOutcomeByClaimId: Map<string, { decision: string; outcome: string; updated_at: string }>;
  evidenceByClaimId: Map<string, EvidencePackageRow | null>;
  customerById: Map<string, CustomerProfileSummary>;
  currentUserId: string;
  initialSelectedCaseId?: string | null;
  recoveryMetricRows: Array<{
    status: string;
    total_estimated_loss: number | null;
    amount_at_risk: number | null;
    currency: string | null;
    recoverability: string | null;
    recovery_owner: string | null;
    recoverable_minor?: number | null;
    recoverable_state?: 'known' | 'unavailable';
  }>;
  recoveryMetricCoverage: ClaimMetricCoverage;
  page: number;
  totalPages: number;
  totalMatching: number;
  basePath: '/cases';
};

function CasesStatePanel({ title, description, actionHref, actionLabel, stateId }: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  stateId?: string;
}) {
  return (
    <div data-state-id={stateId} style={{ height: '100%', minHeight: 220, display: 'grid', placeItems: 'center', padding: 22 }}>
      <div style={{ width: 'min(420px,100%)', padding: '22px 24px', borderRadius: 12, background: '#f4f3f1', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: '#1c1f23', font: "500 15px/1.35 'Inter',sans-serif" }}>{title}</h2>
        <p style={{ margin: '7px auto 0', maxWidth: 350, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{description}</p>
        <Link href={actionHref} style={{ minHeight: 32, marginTop: 14, padding: '0 11px', display: 'inline-grid', placeItems: 'center', borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 11.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>{actionLabel}</Link>
      </div>
    </div>
  );
}

export function ClaimsPageView({
  connectionState,
  queueCounts,
  coverageByMetric,
  aggregateCoverage,
  casesSummary,
  casesFlow,
  isEmpty,
  resultText,
  pageSize: _pageSize,
  filterTabs,
  queueFilter,
  sp,
  searchTerm,
  slaFilter,
  claims,
  listView,
  latestOutcomeByClaimId,
  evidenceByClaimId,
  customerById,
  currentUserId,
  initialSelectedCaseId,
  recoveryMetricRows,
  recoveryMetricCoverage,
  page,
  totalPages,
  totalMatching,
  basePath,
}: ClaimsPageViewProps) {
  if (!isEmpty && claims.length > 0) {
    return <ExactClaimsPageView {...{
      connectionState,
      queueCounts,
      coverageByMetric,
      aggregateCoverage,
      casesSummary,
      casesFlow,
      isEmpty,
      resultText,
      pageSize: _pageSize,
      filterTabs,
      queueFilter,
      sp,
      searchTerm,
      slaFilter,
      claims,
      listView,
      latestOutcomeByClaimId,
      evidenceByClaimId,
      customerById,
      currentUserId,
      initialSelectedCaseId,
      recoveryMetricRows,
      recoveryMetricCoverage,
      page,
      totalPages,
      totalMatching,
      basePath,
    }} />;
  }
  const currentViewCoverage = coverageForClaimsListView(listView, coverageByMetric);
  const emptyDescription = searchTerm
    ? `${currentViewCoverage === 'complete' ? 'No cases' : 'No observed cases'} match “${searchTerm}”.`
    : listView.kind === 'unread'
    ? 'No cases with new evidence right now.'
    : listView.kind === 'workflow' && listView.workflow === 'needs_evidence'
      ? 'No cases needing evidence right now.'
      : listView.kind === 'workflow' && listView.workflow === 'awaiting_carrier'
        ? 'No cases awaiting carrier clarification right now.'
        : listView.kind === 'workflow' && listView.workflow === 'awaiting_3pl'
          ? 'No cases awaiting 3PL clarification right now.'
          : listView.kind === 'workflow' && listView.workflow === 'awaiting_supplier'
            ? 'No cases awaiting supplier clarification right now.'
            : listView.kind === 'workflow' && listView.workflow === 'ready_for_decision'
              ? 'No cases ready for decision right now.'
              : listView.kind === 'workflow' && listView.workflow === 'manual_review'
                ? 'No cases in manual review right now.'
                : listView.kind === 'workflow' && listView.workflow === 'closed'
                  ? 'No closed cases yet.'
                  : listView.kind === 'history'
                    ? 'No cases with recorded outcomes yet.'
                    : listView.kind === 'snoozed'
                      ? 'No deferred cases right now.'
                      : listView.kind === 'assigned_me'
                        ? 'No assigned cases right now.'
                        : listView.kind === 'unassigned'
                          ? 'No cases needing review right now.'
                          : slaFilter === 'overdue'
                            ? 'No ageing cases in this view.'
                            : listView.kind === 'status' && listView.status === 'open'
                              ? 'No cases with a policy match right now.'
                              : listView.kind === 'status' && listView.status === 'pending'
                                ? 'No cases waiting on source data right now.'
                                : listView.kind === 'status' && listView.status === 'escalated'
                                  ? 'No cases with strong identity evidence right now.'
                                  : 'No cases match this filter.';
  const filterKeys = ['queue', 'owner', 'viewed', 'status', 'evidence_posture', 'responsibility', 'claim_readiness', 'deadline'] as const;
  const activeFilterCount = filterKeys.filter((key) => sp[key]).length;
  const newCaseOpen = sp.new === '1';
  const gbpFinancialRows = recoveryMetricRows.filter((row) => row.currency?.toUpperCase() === 'GBP');
  const recoverableRows = gbpFinancialRows.filter((row) => row.recoverable_state === 'known' && typeof row.recoverable_minor === 'number');
  const recoverableTotal = recoverableRows.reduce((sum, row) => sum + (row.recoverable_minor ?? 0), 0);
  const recoverableComplete = recoveryMetricCoverage === 'complete'
    && recoveryMetricRows.length > 0
    && recoveryMetricRows.length === gbpFinancialRows.length
    && gbpFinancialRows.every((row) => row.recoverable_state === 'known' && typeof row.recoverable_minor === 'number');
  const recoverableLabel = recoverableComplete
    ? formatMinorCurrencyNullable(recoverableTotal, 'GBP') ?? 'Unavailable'
    : recoverableRows.length > 0
      ? `${formatMinorCurrencyNullable(recoverableTotal, 'GBP') ?? 'Unavailable'} observed · partial`
      : 'Unavailable';
  const recoveryRateLabel = recoverableComplete
    ? 'Eligible recovery · received progress is in Reports'
    : 'Eligible recovery basis unavailable';
  const previousHref = page > 1 ? `${basePath}${buildClaimsQueryString(sp, { page: String(page - 1) })}` : null;
  const nextHref = page < totalPages ? `${basePath}${buildClaimsQueryString(sp, { page: String(page + 1) })}` : null;
  const toolbarResult = listView.kind === 'active' && currentViewCoverage === 'complete'
    ? `${formatNumber(queueCounts.active)} of ${formatNumber(queueCounts.total)} · ${casesSummary.atRisk.label} needs action`
    : resultText;
  const hasCaseData = claims.length > 0 || queueCounts.total > 0;
  return (
    <>
    {!connectionState.helpdesk && hasCaseData ? (
      <div data-state-id="cases-partial-source" style={{ minHeight: 35, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #ead8b6', background: '#fff3e9', color: '#7a5310', font: "400 10.5px/1.4 'Inter',sans-serif" }}><span style={{ width: 6, height: 6, flex: '0 0 6px', borderRadius: '50%', background: '#c98a1a' }}/><span style={{ flex: 1 }}>Case context is partial because a support source is not connected.</span><Link href="/sources/connected" style={{ color: '#7a5310', fontWeight: 500, textDecoration: 'none' }}>Complete setup</Link></div>
    ) : null}
    <section data-screen-label="Cases" data-reference-id="Cases-Clean" data-visual-world="supplied-package" data-surface-id="cases-registry" data-archetype="P5" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Cases</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <CasesQueueTabs filterTabs={filterTabs} />
        <CasesCompactFilters resultText={resultText} filterTabs={filterTabs} sp={sp} basePath={basePath} activeFilterCount={activeFilterCount}/>
        <span style={{ flex: 1 }}/><span style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{toolbarResult}</span>
        <Link href={`${basePath}?new=1`} style={{ padding: '7px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>New case</Link>
      </div>
      {isEmpty ? (
        <CasesStatePanel
          stateId="cases-first-use"
          title={connectionState.helpdesk ? 'No cases yet' : 'Connect a support source to use Cases'}
          description={connectionState.helpdesk ? 'New support conversations that require payout review will appear here.' : 'Connect Gorgias, Zendesk, or Freshdesk so Unauth can match customer conversations to orders and evidence.'}
          actionHref={connectionState.helpdesk ? '/sources/browse' : '/sources/connected'}
          actionLabel={connectionState.helpdesk ? 'Review sources' : 'Connect support source'}
        />
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          <section aria-label="Opened against closed" style={{ flex: 'none', background: '#f4f3f1', borderRadius: 12, padding: '11px 14px 12px', display: 'flex', alignItems: 'flex-end', gap: 18 }}><div style={{ width: 170, flex: '0 0 170px' }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>OPENED AGAINST CLOSED</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}><span style={{ font: "400 19px/1 'IBM Plex Mono',monospace", color: casesFlow && casesFlow.netChange > 0 ? '#b0431a' : '#1a6b43' }}>{casesFlow ? `${casesFlow.netChange > 0 ? '+' : ''}${casesFlow.netChange}` : 'Unavailable'}</span><span style={{ font: "400 11px/1.4 'Inter',sans-serif", color: '#64686d' }}>net open in 30 days</span></div></div><CasesFlowChart flow={casesFlow}/><div style={{ width: 172, flex: '0 0 172px', display: 'flex', flexDirection: 'column', gap: 5 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: '#e8802a' }}/><span style={{ font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>opened · {casesFlow?.opened30d ?? '—'} total</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(28,27,25,.22)' }}/><span style={{ font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>closed · {casesFlow?.closed30d ?? '—'} total</span></div><span style={{ font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d', marginTop: 2 }}>{casesFlowWindow(casesFlow)}</span></div></section>
              <div aria-label="Case metrics" style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div style={{ background: '#f4f3f1', borderRadius: 12, padding: '12px 13px' }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', marginBottom: 7 }}>AT RISK · NEEDS ACTION</div><div style={{ font: "400 14px/1.35 'Inter',sans-serif", color: '#1c1f23', overflowWrap: 'anywhere' }}>{casesSummary.atRisk.label}</div></div>
            <div style={{ background: '#f4f3f1', borderRadius: 12, padding: '12px 13px' }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', marginBottom: 7 }}>BREACHING SLA</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#b0431a' }}>{coverageByMetric.overdue === 'complete' ? formatNumber(queueCounts.overdue) : 'Unavailable'}</span><span style={{ font: "400 11px/1 'Inter',sans-serif", color: '#64686d' }}>cases</span></div></div>
            <div style={{ background: '#f4f3f1', borderRadius: 12, padding: '12px 13px' }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', marginBottom: 7 }}>EVIDENCE GAPS</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>{coverageByMetric.awaitingEvidence === 'complete' ? formatNumber(queueCounts.awaitingEvidence) : 'Unavailable'}</span><span style={{ font: "400 11px/1 'Inter',sans-serif", color: '#64686d' }}>blocked on source</span></div></div>
            <div style={{ background: '#f4f3f1', borderRadius: 12, padding: '12px 13px' }}><div style={{ font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', marginBottom: 7 }}>RECOVERABLE</div><div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 7 }}><span style={{ font: "400 14px/1.35 'Inter',sans-serif", color: '#1c1f23', overflowWrap: 'anywhere' }}>{recoverableLabel}</span><span style={{ font: "400 11px/1.35 'Inter',sans-serif", color: '#64686d' }}>{recoveryRateLabel}</span></div></div>
          </div>
          <div aria-label="Cases registry and selected preview" style={{ flex: 1, minHeight: 0, overflow: 'visible' }}>
            {claims.length === 0 && currentViewCoverage !== 'complete' && !searchTerm ? (
              <CasesStatePanel
                stateId="cases-count-unavailable"
                title="Case count unavailable"
                description="The available case rows are shown, but this queue could not be evaluated completely. No zero or empty result has been inferred."
                actionHref="/sources/connected"
                actionLabel="Review connected sources"
              />
            ) : claims.length === 0 ? (
              <div data-state-id="cases-empty-filter-states">
              <div data-state-id="cases-no-filter-results">
              <CasesStatePanel
                title={emptyDescription}
                description={searchTerm && currentViewCoverage !== 'complete'
                  ? 'No matching case exists in the available read model. Source coverage remains partial, so this is not a verified zero across unavailable records.'
                  : queueFilter === 'active'
                  ? 'Recorded outcomes may still contain the case you need.'
                  : 'Return to active work to review cases that still need attention.'}
                actionHref={queueFilter === 'active' ? `${basePath}?queue=history` : `${basePath}?queue=active`}
                actionLabel={queueFilter === 'active' ? 'View recorded outcomes' : 'View active cases'}
              />
              </div>
              </div>
            ) : (
              <ClaimsQueueClient
                claims={claims}
                outcomesRecord={Object.fromEntries(latestOutcomeByClaimId)}
                evidenceRecord={Object.fromEntries(evidenceByClaimId)}
                customersRecord={Object.fromEntries(customerById)}
                currentUserId={currentUserId}
                initialSelectedCaseId={initialSelectedCaseId}
                page={page}
                totalPages={totalPages}
                totalMatching={totalMatching}
                previousHref={previousHref}
                nextHref={nextHref}
                basePath={basePath}
              />
            )}
          </div>
        </div>
      )}
    </section>
    <ManualCaseDialog open={newCaseOpen} />
    </>
  );
}
