'use client';

import {
  PAYOUT_CASE_NEXT_ACTION_LABELS,
  PAYOUT_CASE_STATUS_LABELS,
  PAYOUT_DECISION_STATE_LABELS,
  REQUESTED_ACTION_LABELS,
  RECOVERY_STATE_LABELS,
  type CaseClarificationRequest,
  type SupportPayoutCase,
} from '@/lib/payouts/types';
import { PAYOUT_DISCLAIMER } from '@/components/claims/payout/payoutCopy';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { PayoutExposureCard } from '@/components/claims/payout/PayoutExposureCard';
import { EvidenceChecklistCard } from '@/components/claims/payout/EvidenceChecklistCard';
import { DeliveryEvidenceCard } from '@/components/claims/payout/DeliveryEvidenceCard';
import { LossAttributionCard } from '@/components/claims/payout/LossAttributionCard';
import { RecoveryPathCard } from '@/components/claims/payout/RecoveryPathCard';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';

/**
 * Money-first payout decision lead block for a support payout case. Reads the
 * SupportPayoutCase from the transitional claim decision response.
 * Advisory throughout — the merchant owns the decision.
 */
export function PayoutCaseLeadBlock({
  payoutCase,
  recoveryCase,
  delivery,
  loading,
  stale,
}: {
  payoutCase: SupportPayoutCase | null | undefined;
  recoveryCase?: RecoveryCase | null;
  delivery?: import('@/lib/claims/decision/types').ClaimDecisionContext['delivery'];
  loading?: boolean;
  stale?: boolean;
}) {
  if (!payoutCase) {
    if (!loading) return null;
    return (
      <section
        className="rounded-md p-4 border"
        style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
      >
        <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
          Loading payout exposure…
        </p>
      </section>
    );
  }

  const requestedActionLabel = REQUESTED_ACTION_LABELS[payoutCase.requestedAction.primary];

  return (
    <div className="space-y-4">
      {stale && (
        <p className="text-caption" style={{ color: 'var(--warning)' }}>
          Case context changed - payout exposure may be outdated.
        </p>
      )}
      <PayoutWorkflowSummary payoutCase={payoutCase} recoveryCase={recoveryCase ?? null} />
      <PayoutExposureCard exposure={payoutCase.exposure} requestedActionLabel={requestedActionLabel} />
      <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery ?? null} />
      {payoutCase.claimType === 'item_not_received' || payoutCase.claimType === 'missing_item' ? (
        <DeliveryEvidenceCard delivery={delivery ?? null} />
      ) : null}
      <LossAttributionCard attribution={payoutCase.attribution} />
      <RecoveryPathCard recovery={payoutCase.recovery} />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {PAYOUT_DISCLAIMER}
      </p>
    </div>
  );
}

function PayoutWorkflowSummary({
  payoutCase,
  recoveryCase,
}: {
  payoutCase: SupportPayoutCase;
  recoveryCase: RecoveryCase | null;
}) {
  const present = payoutCase.evidence.items.filter((item) => item.state === 'present');
  const missing = payoutCase.evidence.items.filter((item) => item.state !== 'present');

  return (
    <section
      className="rounded-md border p-4"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
            Payout workflow
          </p>
          <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {PAYOUT_CASE_STATUS_LABELS[payoutCase.status]}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {payoutCase.nextActionReason}
          </p>
        </div>
        <span className="rounded-[6px] px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
          {PAYOUT_CASE_NEXT_ACTION_LABELS[payoutCase.nextAction]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WorkflowFact label="Requested action" value={REQUESTED_ACTION_LABELS[payoutCase.requestedAction.primary]} />
        <WorkflowFact label="Payout exposure" value={`${payoutCase.exposure.total.currency ?? 'USD'} ${payoutCase.exposure.total.amount.toFixed(2)}`} />
        <WorkflowFact label="Decision state" value={PAYOUT_DECISION_STATE_LABELS[payoutCase.payoutDecisionState]} />
        <WorkflowFact label="Recovery" value={RECOVERY_STATE_LABELS[payoutCase.recoveryState]} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <EvidencePillGroup title="Evidence present" items={present.map((item) => item.label)} empty="No expected evidence on file yet." />
        <EvidencePillGroup title="Evidence missing" items={missing.map((item) => item.label)} empty="No evidence gaps flagged." />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Clarification requests</p>
          <ClarificationRequestList requests={payoutCase.clarificationRequests} />
        </div>
        <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
          <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>Agent decision and recovery</p>
          <div className="mt-2 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <p>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Agent decision: </span>
              {payoutCase.agentDecision ?? 'Not recorded'}
            </p>
            <p>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recovery opportunity: </span>
              {payoutCase.recovery.suggestedNextAction}
            </p>
            <p>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Linked recovery case: </span>
              {recoveryCase
                ? `${recoveryCase.id.slice(0, 8)} · ${RECOVERY_STATUS_LABELS[recoveryCase.status] ?? recoveryCase.status}`
                : 'None'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
      <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function EvidencePillGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
      <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.slice(0, 8).map((item) => (
            <span key={item} className="rounded-[6px] px-2 py-0.5 text-[11px]" style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{empty}</p>
      )}
    </div>
  );
}

function ClarificationRequestList({ requests }: { requests: CaseClarificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        No clarification requests recorded yet.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {requests.slice(0, 4).map((request) => (
        <div key={request.id} className="rounded-md border p-2.5" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {request.target_name ?? request.target_type.toUpperCase()}
            </p>
            <span className="rounded-[6px] px-2 py-0.5 text-[11px]" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
              {request.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {request.request_summary}
          </p>
          {request.requested_evidence.length > 0 && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Needs {request.requested_evidence.map(humanizeEvidenceKey).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
