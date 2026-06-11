'use client';

import { signalLabel } from '@/lib/copy/signalLabels';
import { claimEventLabel, claimEventSummary } from '@/lib/claims/events';
import { formatClaimAge, formatFiledDate } from '@/lib/claims/sla';
import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  OUTCOME_LABELS,
} from '@/components/claims/claimReviewLabels';
import { formatClaimMoney } from '@/components/claims/claimReviewStyles';
import { actorLabel } from '@/components/claims/claimReviewLogic';
import { CaseIntelTile, StatusPill, SlaBadge } from '@/components/claims/claimReviewPrimitives';
import { ClaimReviewHistoryTable } from '@/components/claims/ClaimReviewHistoryTable';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { ClaimType, Decision, Outcome } from '@/components/claims/claimReviewTypes';

export function ClaimReviewContextColumn({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    selectedClaim,
    latestOutcome,
    previousOutcome,
    evidenceRecorded,
    selectedClaimEvents,
    history,
    data,
    order,
    fraudFlags,
    identityPoints,
    confidenceLabel,
    withinStoreSignals,
    crossMerchantCount,
    supportCases,
    state,
    patch,
    setClaimId,
  } = wb;

  return (
    <div className="space-y-4 min-w-0 order-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
      <section className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
        <p className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Claim evidence context</p>
        {selectedClaim ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              <CaseIntelTile label="Claim">
                <p className="font-semibold">{CLAIM_TYPE_LABELS[selectedClaim.claim_type as ClaimType] ?? selectedClaim.claim_type}</p>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{selectedClaim.customer_claim_reason || 'No customer reason recorded'}</p>
              </CaseIntelTile>
              <CaseIntelTile label="Order">
                <p className="font-mono text-xs">{selectedClaim.shopify_order_id ?? selectedClaim.order_ref ?? '-'}</p>
                <p className="font-semibold mt-1">{selectedClaim.amount_at_risk != null ? formatClaimMoney(selectedClaim.amount_at_risk, selectedClaim.currency) : '-'}</p>
              </CaseIntelTile>
              <CaseIntelTile label="Status">
                <div className="flex flex-wrap gap-1"><StatusPill status={selectedClaim.status} /><SlaBadge claim={selectedClaim} /></div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{formatClaimAge(selectedClaim)} · {formatFiledDate(selectedClaim)}</p>
              </CaseIntelTile>
              <CaseIntelTile label="Evidence">
                <p className="font-semibold" style={{ color: evidenceRecorded ? 'var(--success)' : 'var(--text)' }}>{evidenceRecorded ? 'On record' : 'Missing'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{evidenceRecorded ? 'Ready for merchant outcome' : 'Add evidence in the panel on the right'}</p>
              </CaseIntelTile>
              <CaseIntelTile label="Review state">
                <p className="font-semibold">{selectedClaim.first_viewed_at ? 'Needs review' : 'New evidence'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {selectedClaim.first_viewed_at
                    ? `Reviewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString('en-US')}`
                    : 'Not yet reviewed'}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Outcome">
                {latestOutcome ? (
                  <>
                    <p className="font-semibold text-xs leading-tight">{DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}</p>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Not recorded</p>
                )}
              </CaseIntelTile>
            </div>
            {selectedClaim.normalized_reason && (
              <p className="text-xs rounded-md px-3 py-2" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>Internal notes: </span>
                {selectedClaim.normalized_reason}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No claim selected. Expand Edit claim details at the bottom of this column to create one.</p>
        )}
      </section>

      <div className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Linked identity confidence</p>
            <p className="mt-1 text-xs max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Evidence suggests these records belong to the same identity based on matching data points. Unauth shows context; the merchant owns the action.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Identity confidence</p>
            <p className="font-semibold text-lg" style={{ color: 'var(--text)' }}>{confidenceLabel}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Linked accounts</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{data?.linkedAccounts?.length ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Refund/fulfilment</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{String(order?.refundStatus ?? '-')}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Previous claims</p>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{history.length}</p>
          </div>
        </div>
        {fraudFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fraudFlags.slice(0, 5).map((f) => (
              <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                {signalLabel(f).short}
              </span>
            ))}
          </div>
        )}
        {identityPoints.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Matching data points</p>
            <div className="flex flex-wrap gap-1.5">
              {identityPoints.map((point) => (
                <span key={point} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}>
                  {point}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Cross-merchant and identity-link context</p>
          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{crossMerchantCount > 1 ? `Aggregate signal across ${crossMerchantCount} merchants` : 'Store-scoped signal'}</span>
        </div>
        <div className="mb-3 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
          <p className="font-semibold" style={{ color: 'var(--text)' }}>
            {crossMerchantCount > 1 ? 'Cross-merchant signal detected' : 'No cross-merchant aggregate signal yet'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {crossMerchantCount > 1
              ? 'Unauth has an anonymised aggregate signal that this identity appears in multiple merchant datasets. Merchant-specific details are not exposed here.'
              : 'No network-level merchant recurrence is available for this identity. Continue with store-owned evidence.'}
          </p>
        </div>
        {withinStoreSignals.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No additional store-scoped identity variants found yet.</p>
        ) : (
          <div className="space-y-2">
            {withinStoreSignals.map((row) => (
              <div key={row.key} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 rounded-md border p-2.5 text-xs" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
                <span className="font-semibold capitalize">{row.signal}</span>
                <span>{row.detail}</span>
                <span>{row.reason}</span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{row.date ? new Date(row.date).toLocaleDateString('en-US') : '-'}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{row.grade}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedClaim && latestOutcome && (
        <section className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
          <p className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Recorded merchant outcome</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Merchant-recorded outcome</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}
              </p>
              {latestOutcome.actor_user_id && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{actorLabel(latestOutcome.actor_user_id)}</p>}
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Outcome</p>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}
              </p>
              {latestOutcome.updated_at && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(latestOutcome.updated_at).toLocaleString('en-US')}</p>
              )}
            </div>
            {previousOutcome && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Previous outcome</p>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>
                  {DECISION_LABELS[previousOutcome.decision as Decision] ?? previousOutcome.decision} / {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ?? previousOutcome.outcome}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <SupportCaseContextList cases={supportCases} />

      <section className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
        <div className="mb-3 inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
          <button type="button" onClick={() => patch({ auditTab: 'timeline' })} className="px-2.5 py-1 text-xs rounded" style={{ background: state.auditTab === 'timeline' ? 'var(--accent)' : 'transparent', color: state.auditTab === 'timeline' ? 'white' : 'var(--text-secondary)' }}>Event timeline</button>
          <button type="button" onClick={() => patch({ auditTab: 'history' })} className="px-2.5 py-1 text-xs rounded" style={{ background: state.auditTab === 'history' ? 'var(--accent)' : 'transparent', color: state.auditTab === 'history' ? 'white' : 'var(--text-secondary)' }}>Claim history</button>
        </div>
        {state.auditTab === 'timeline' && (
          <>
            {!selectedClaim ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a claim to view its audit history.</p>
            ) : selectedClaimEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No claim events recorded yet.</p>
            ) : (
              <ol className="space-y-2">
                {selectedClaimEvents.map((event) => (
                  <li key={event.id} className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{claimEventLabel(event.event_type)}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{claimEventSummary(event)}</p>
                      </div>
                      <div className="text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <p>{event.created_at ? new Date(event.created_at).toLocaleString('en-US') : '-'}</p>
                        {event.actor_user_id && <p>{actorLabel(event.actor_user_id)}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {state.auditTab === 'history' && (
          <ClaimReviewHistoryTable history={history} onSelectClaim={setClaimId} />
        )}
      </section>
    </div>
  );
}
