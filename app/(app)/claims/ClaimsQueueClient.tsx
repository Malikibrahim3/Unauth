'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink, FileText, ArrowRight, Clock } from 'lucide-react';
import { StatusPill, SlaPill } from '@/app/(app)/claims/claimsPageUi';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { formatClaimAge, formatFiledDate } from '@/lib/claims/sla';
import {
  LIKELY_OWNER_LABELS,
  LOSS_ATTRIBUTION_DISPLAY,
  PAYOUT_CASE_NEXT_ACTION_LABELS,
  PAYOUT_CASE_STATUS_LABELS,
  RECOVERABILITY_LABELS,
  RECOVERY_STATE_LABELS,
} from '@/lib/payouts/types';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from '@/app/(app)/claims/claimsPageData';
import { claimNextAction } from '@/app/(app)/claims/claimsPageLogic';

type Outcome = { decision: string; outcome: string; updated_at: string };

type Props = {
  claims: ClaimRow[];
  outcomesRecord: Record<string, Outcome>;
  evidenceRecord: Record<string, EvidencePackageRow | null>;
  customersRecord: Record<string, CustomerProfileSummary>;
  currentUserId: string;
  initialFocusClaimId?: string | null;
};

function customerDisplayName(customer: CustomerProfileSummary | null | undefined) {
  if (!customer) return 'Unknown customer';
  return customer.names?.[0] ?? `hash:${customer.id.slice(0, 10)}`;
}

function resolveInitialSelection(claims: ClaimRow[], initialFocusClaimId?: string | null): string | null {
  if (initialFocusClaimId && claims.some((c) => c.id === initialFocusClaimId)) {
    return initialFocusClaimId;
  }
  return claims[0]?.id ?? null;
}

function workflowStatusLabel(status: string): string {
  return PAYOUT_CASE_STATUS_LABELS[status as keyof typeof PAYOUT_CASE_STATUS_LABELS] ?? status.replace(/_/g, ' ');
}

function nextActionLabel(action: string | null | undefined): string | null {
  if (!action) return null;
  return PAYOUT_CASE_NEXT_ACTION_LABELS[action as keyof typeof PAYOUT_CASE_NEXT_ACTION_LABELS] ?? action.replace(/_/g, ' ');
}

function sourceSystemLabel(claim: ClaimRow): string {
  if (claim.source_ticket_ref) return `Helpdesk #${claim.source_ticket_ref}`;
  if (claim.shopify_order_id) return 'Commerce order';
  return 'Manual case';
}

export function ClaimsQueueClient({
  claims,
  outcomesRecord,
  evidenceRecord,
  customersRecord,
  currentUserId,
  initialFocusClaimId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialSelection(claims, initialFocusClaimId),
  );

  const selected = selectedId ? claims.find((c) => c.id === selectedId) ?? null : null;
  const selectedOutcome = selectedId ? (outcomesRecord[selectedId] ?? null) : null;
  const selectedEvidence = selectedId ? (evidenceRecord[selectedId] ?? null) : null;
  const selectedCustomer = selected?.customer_id
    ? (customersRecord[selected.customer_id] ?? null)
    : null;
  const selectedOps = selected
    ? claimNextAction(selected, selectedOutcome, currentUserId)
    : null;

  return (
    <div className="flex" style={{ minHeight: 560, borderTop: '1px solid var(--border-muted)' }}>
      {/* Left review list */}
      <div
        className="shrink-0 overflow-y-auto border-r"
        style={{
          width: 360,
          borderColor: 'var(--border-muted)',
          background: 'var(--surface)',
        }}
      >
        {claims.map((c) => {
          const customer = c.customer_id ? (customersRecord[c.customer_id] ?? null) : null;
          const isSelected = c.id === selectedId;
          const ops = claimNextAction(c, outcomesRecord[c.id] ?? null, currentUserId);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className="w-full text-left border-b transition-colors"
              style={{
                padding: '11px 14px',
                borderColor: 'var(--border-muted)',
                background: isSelected
                  ? 'color-mix(in srgb, var(--accent) 7%, var(--surface))'
                  : 'transparent',
                borderLeft: isSelected
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p
                  className="text-body-sm font-medium truncate"
                  style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text)' }}
                >
                  {customerDisplayName(customer)}
                </p>
                <span
                  className="shrink-0 text-caption font-mono tabular-nums"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined) ?? '—'}
                </span>
              </div>
              <p
                className="text-caption font-mono mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {c.shopify_order_id ?? c.id.slice(0, 8)}&nbsp;·&nbsp;
                {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
              </p>
              <p
                className="text-caption font-medium mb-1"
                style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {ops.nextActionLabel}
              </p>
              <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {sourceSystemLabel(c)}
                {ops.daysWaiting != null ? ` · ${ops.daysWaiting}d waiting` : ''}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusPill status={c.status} />
                <SlaPill claim={c} />
                {customer?.risk_level && (
                  <ConfidenceBadge grade={riskLevelToNewGrade(customer.risk_level)} size="sm" />
                )}
                {c.recoverability && (
                  <span className="rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
                    {RECOVERABILITY_LABELS[c.recoverability as keyof typeof RECOVERABILITY_LABELS] ?? c.recoverability}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right detail panel */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--surface-sunken)' }}>
        {selected && selectedOps ? (
          <ClaimDetailPanel
            claim={selected}
            ops={selectedOps}
            outcome={selectedOutcome}
            evidence={selectedEvidence}
            customer={selectedCustomer}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 py-16 text-center">
            <div>
              <p
                className="text-body-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Select a claim to review
              </p>
              <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                Choose any claim from the list on the left.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimDetailPanel({
  claim,
  ops,
  outcome,
  evidence,
  customer,
}: {
  claim: ClaimRow;
  ops: ReturnType<typeof claimNextAction>;
  outcome: Outcome | null;
  evidence: EvidencePackageRow | null;
  customer: CustomerProfileSummary | null;
}) {
  const orderRef = claim.shopify_order_id ?? claim.id.slice(0, 8);

  return (
    <div className="p-5 space-y-4">
      {/* Claim header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusPill status={claim.status} />
          <SlaPill claim={claim} />
          {claim.amount_at_risk != null && (
            <span
              className="text-caption font-mono font-semibold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined)}
            </span>
          )}
        </div>
        <h2 className="t-heading" style={{ color: 'var(--text-primary)' }}>
          {CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}
        </h2>
        <p className="text-caption mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {orderRef}
          {claim.shop_domain ? ` · ${claim.shop_domain}` : ''}
          {' · '}Filed {formatFiledDate(claim)}
          {' · '}Age {formatClaimAge(claim)}
        </p>
      </div>

      {/* Workflow state — primary call-out */}
      <section
        className="rounded-md border px-4 py-3"
        style={{
          background: 'var(--info-bg)',
          borderColor: 'var(--info-bd)',
        }}
      >
        <p
          className="text-caption font-semibold uppercase tracking-wide mb-0.5"
          style={{ color: 'var(--info)', letterSpacing: '0.06em' }}
        >
          Workflow
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Current state</p>
            <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {workflowStatusLabel(claim.status)}
            </p>
          </div>
          <div>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Next action</p>
            <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {ops.nextActionLabel}
            </p>
          </div>
          <div>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Payout exposure</p>
            <p className="text-body-sm font-mono font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Days waiting</p>
            <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {ops.daysWaiting == null ? '—' : `${ops.daysWaiting}d`}
            </p>
          </div>
        </div>
        <p className="text-caption mt-2" style={{ color: 'var(--text-secondary)' }}>
          {ops.reviewState}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
            {ops.evidenceStatus}
          </span>
          {claim.next_action && (
            <span className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
              {nextActionLabel(claim.next_action)}
            </span>
          )}
          {claim.recovery_state && (
            <span className="rounded-[6px] px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>
              {RECOVERY_STATE_LABELS[claim.recovery_state as keyof typeof RECOVERY_STATE_LABELS] ?? claim.recovery_state}
            </span>
          )}
        </div>
        <Link
          href={`/claims/${claim.id}`}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-caption font-semibold btn-accent"
        >
          Review evidence <ArrowRight className="h-3 w-3" />
        </Link>
      </section>

      {/* Recovery chase-up */}
      {(claim.recoverability || claim.recovery_owner || claim.loss_attribution) && (
        <section
          className="rounded-md border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <p
              className="text-caption font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
            >
              Recovery chase-up
            </p>
            {claim.recoverability && (
              <span className="rounded-md px-2 py-0.5 text-caption font-semibold" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
                {RECOVERABILITY_LABELS[claim.recoverability as keyof typeof RECOVERABILITY_LABELS] ?? claim.recoverability}
              </span>
            )}
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Partner</p>
                <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {claim.recovery_owner ? LIKELY_OWNER_LABELS[claim.recovery_owner as keyof typeof LIKELY_OWNER_LABELS] ?? claim.recovery_owner : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Attribution</p>
                <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {claim.loss_attribution ? LOSS_ATTRIBUTION_DISPLAY[claim.loss_attribution as keyof typeof LOSS_ATTRIBUTION_DISPLAY] ?? claim.loss_attribution : 'Unclear'}
                </p>
              </div>
            </div>
            {claim.recovery_next_action && (
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                {claim.recovery_next_action}
              </p>
            )}
            {claim.recovery_required_evidence && claim.recovery_required_evidence.length > 0 && (
              <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                Evidence needed: {claim.recovery_required_evidence.map(humanizeEvidenceKey).join(', ')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Evidence package */}
      <section
        className="rounded-md border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--privacy-ink)' }} />
            <p
              className="text-caption font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}
            >
              Evidence package
            </p>
          </div>
        </div>
        <div className="px-4 py-3">
          {evidence ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-body-sm font-semibold font-mono truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {evidence.reference_number}
                </p>
                <p className="text-caption mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Generated{' '}
                  {new Date(evidence.generated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Link
                href={`/claims/${claim.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-semibold btn-accent"
              >
                <FileText className="h-3.5 w-3.5" /> Open evidence package
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                No evidence package for this claim yet.
              </p>
              {claim.customer_id && (
                <Link
                  href={`/customers/${claim.customer_id}`}
                  className="shrink-0 text-caption font-semibold hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Build evidence →
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Customer identity */}
      {customer && (
        <section
          className="rounded-md border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <p
              className="text-caption font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
            >
              Customer
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                Identity grade
              </span>
              <ConfidenceBadge grade={riskLevelToNewGrade(customer.risk_level)} size="sm" showLabel={false} />
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-body-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {customerDisplayName(customer)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PrivacyBadge value="Hashed" />
                  <p className="text-caption font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {customer.id}
                  </p>
                </div>
              </div>
              <Link
                href={`/customers/${customer.id}`}
                className="shrink-0 inline-flex items-center gap-1 text-caption font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Profile <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Merchant-recorded outcome (if any) */}
      {outcome && (
        <section
          className="rounded-md border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <Clock className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <p
              className="text-caption font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
            >
              Merchant-recorded outcome
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {DECISION_LABELS[outcome.decision] ?? outcome.decision}
            </p>
            {outcome.outcome && outcome.outcome !== outcome.decision && (
              <p className="text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {outcome.outcome}
              </p>
            )}
            <p className="text-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Updated {new Date(outcome.updated_at).toLocaleDateString('en-US')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
