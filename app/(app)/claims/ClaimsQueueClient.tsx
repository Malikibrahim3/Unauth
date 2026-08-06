"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react";
import { StatusPill, SlaPill } from "@/app/(app)/claims/claimsPageUi";
import {
  Badge,
  ButtonLink,
  EvidenceRow,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  formatCurrencyNullable,
  formatDateAbsolute,
  formatDateTime,
} from "@/lib/utils/format";
import { formatClaimAge, formatFiledDate, getClaimSlaState } from "@/lib/claims/sla";
import {
  LIKELY_OWNER_LABELS,
  LOSS_ATTRIBUTION_DISPLAY,
} from "@/lib/payouts/types";
import {
  humanizeEvidenceKey,
  humanizeEvidenceProse,
} from "@/components/claims/payout/payoutCopy";
import { shortRef } from "@/lib/ui/displayRef";
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  outcomeLabel,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from "@/app/(app)/claims/claimsPageData";
import { claimNextAction } from "@/app/(app)/claims/claimsPageLogic";

type Outcome = { decision: string; outcome: string; updated_at: string };

type Props = {
  claims: ClaimRow[];
  outcomesRecord: Record<string, Outcome>;
  evidenceRecord: Record<string, EvidencePackageRow | null>;
  customersRecord: Record<string, CustomerProfileSummary>;
  currentUserId: string;
  initialFocusClaimId?: string | null;
  basePath?: '/claims' | '/cases';
};

function customerDisplayName(
  customer: CustomerProfileSummary | null | undefined,
) {
  if (!customer) return "Identity pending";
  return customer.names?.[0] ?? customer.primary_email ?? "Identity pending";
}

function resolveInitialSelection(
  claims: ClaimRow[],
  initialFocusClaimId?: string | null,
): string | null {
  if (initialFocusClaimId && claims.some((c) => c.id === initialFocusClaimId)) {
    return initialFocusClaimId;
  }
  return claims[0]?.id ?? null;
}

function sourceSystemLabel(claim: ClaimRow): string {
  if (claim.source_ticket_ref) return `Helpdesk #${claim.source_ticket_ref}`;
  if (claim.shopify_order_id) return "Commerce order";
  return "Manual case";
}

function casePreviewPrimaryAction(claim: ClaimRow) {
  if (claim.status === "recovery_opened") {
    return { label: "Open recovery", hash: "case-recovery" };
  }
  if (claim.status === "decision_recorded") {
    return { label: "Review outcome", hash: "case-customer-action" };
  }
  if ([
    "evidence_needed",
    "awaiting_customer_evidence",
    "awaiting_carrier_response",
    "awaiting_3pl_response",
    "awaiting_supplier_response",
  ].includes(claim.status)) {
    return { label: "Review evidence", hash: "case-evidence" };
  }
  return { label: "Review case", hash: "case-customer-action" };
}

function missingEvidenceCopy(claim: ClaimRow): string {
  if (claim.status === "recovery_opened") {
    return "No generated evidence package is attached. The recorded decision and recovery activity remain in the case record.";
  }
  if (claim.status === "decision_recorded") {
    return "No generated evidence package is attached. The recorded customer decision remains in the case record.";
  }
  return "No generated evidence package is attached to this case.";
}

export function ClaimsQueueClient({
  claims,
  outcomesRecord,
  evidenceRecord,
  customersRecord,
  currentUserId,
  initialFocusClaimId,
  basePath = '/claims',
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialSelection(claims, initialFocusClaimId),
  );

  function selectClaim(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('focus', id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  const selected = selectedId
    ? (claims.find((c) => c.id === selectedId) ?? null)
    : null;
  const selectedOutcome = selectedId
    ? (outcomesRecord[selectedId] ?? null)
    : null;
  const selectedEvidence = selectedId
    ? (evidenceRecord[selectedId] ?? null)
    : null;
  const selectedCustomer = selected?.customer_id
    ? (customersRecord[selected.customer_id] ?? null)
    : null;
  const selectedOps = selected
    ? claimNextAction(selected, selectedOutcome, currentUserId)
    : null;
  const slaStates = claims.map((c) => getClaimSlaState(c).state);
  const uniformSlaState = slaStates.length > 1 && slaStates.every((state) => state === slaStates[0]);

  return (
    <div className="ua-case-queue">
      {/* Left review list */}
      <div
        className="ua-case-queue__list shrink-0 overflow-y-auto border-b lg:max-h-none lg:border-b-0 lg:border-r"
      >
        {claims.map((c) => {
          const customer = c.customer_id
            ? (customersRecord[c.customer_id] ?? null)
            : null;
          const isSelected = c.id === selectedId;
          const ops = claimNextAction(
            c,
            outcomesRecord[c.id] ?? null,
            currentUserId,
          );
          return (
            <button
              key={c.id}
              type="button"
              data-case-id={c.id}
              onClick={() => selectClaim(c.id)}
              aria-pressed={isSelected}
              aria-controls="payout-case-preview"
              className="ua-case-queue__item w-full border-b text-left transition-colors"
              data-selected={isSelected || undefined}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p
                  className="text-body-sm font-medium truncate"
                  style={{
                    color: isSelected ? "var(--ua-text-primary)" : "var(--ua-text-primary)",
                  }}
                >
                  {customerDisplayName(customer)}
                </p>
                <span
                  className="shrink-0 text-caption font-sans tabular-nums"
                  style={{ color: "var(--ua-text-secondary)" }}
                >
                  {formatCurrencyNullable(
                    c.amount_at_risk,
                    c.currency ?? undefined,
                  ) ?? "—"}
                </span>
              </div>
              <p
                className="text-caption mb-1.5"
                style={{
                  color: isSelected
                    ? "var(--ua-text-secondary)"
                    : "var(--ua-text-tertiary)",
                }}
              >
                <span className="font-mono">{shortRef(c.order_ref ?? c.shopify_order_id, c.id)}</span>
                <span aria-hidden="true">&nbsp;·&nbsp;</span>
                <span>{CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}</span>
              </p>
              <p
                className="text-caption font-medium mb-1"
                style={{
                  color: isSelected
                    ? "var(--ua-text-primary)"
                    : "var(--ua-text-secondary)",
                }}
              >
                {ops.nextActionLabel}
              </p>
              <p
                className="text-[length:var(--ua-text-metadata-size)] mb-1.5"
                style={{
                  color: isSelected
                    ? "var(--ua-text-secondary)"
                    : "var(--ua-text-tertiary)",
                }}
              >
                {sourceSystemLabel(c)}
                {` · ${c.assigned_to ? "Assigned" : "Unassigned"}`}
                {ops.daysWaiting != null
                  ? ` · ${ops.daysWaiting}d waiting`
                  : ""}
              </p>
              {(c.investigation_open_count ?? 0) > 0 ? (
                <p
                  className="mb-1.5 text-[length:var(--ua-text-metadata-size)]"
                  style={{
                    color: (c.investigation_overdue_count ?? 0) > 0
                      ? "var(--ua-warning)"
                      : "var(--ua-text-secondary)",
                  }}
                >
                  {(c.investigation_awaiting_review_count ?? 0) > 0
                    ? `${c.investigation_awaiting_review_count} response${c.investigation_awaiting_review_count === 1 ? "" : "s"} to review`
                    : `${c.investigation_overdue_count ? "Overdue · " : "Waiting on "}${c.investigation_waiting_party ?? c.investigation_waiting_target?.replaceAll("_", " ") ?? "external response"}`}
                  {c.investigation_next_due_at
                    ? ` · ${formatDateTime(c.investigation_next_due_at)}`
                    : ""}
                </p>
              ) : null}
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusPill status={c.status} />
                <SlaPill claim={c} uniform={uniformSlaState} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Right detail panel */}
      <div
        id="payout-case-preview"
        className="ua-case-queue__preview min-w-0 flex-1 overflow-y-auto"
        role="region"
        aria-label="Selected case preview"
      >
        {selected && selectedOps ? (
          <ClaimDetailPanel
            claim={selected}
            ops={selectedOps}
            outcome={selectedOutcome}
            evidence={selectedEvidence}
            customer={selectedCustomer}
            basePath={basePath}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 py-16 text-center">
            <div>
              <p
                className="text-body-sm font-medium mb-1"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                Select a case to review
              </p>
              <p
                className="text-caption"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                Choose any case from the list on the left.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="ua-case-queue__decision-rail" aria-label="Decision rail">
        {selected && selectedOps ? (
          <CaseDecisionRail
            claim={selected}
            ops={selectedOps}
            outcome={selectedOutcome}
            evidence={selectedEvidence}
            basePath={basePath}
          />
        ) : (
          <p className="ua-text-caption-role p-5">Select a case to inspect its evidence and available decision.</p>
        )}
      </aside>
    </div>
  );
}

function CaseDecisionRail({
  claim,
  ops,
  outcome,
  evidence,
  basePath,
}: {
  claim: ClaimRow;
  ops: ReturnType<typeof claimNextAction>;
  outcome: Outcome | null;
  evidence: EvidencePackageRow | null;
  basePath: '/claims' | '/cases';
}) {
  const action = casePreviewPrimaryAction(claim);
  const hasRecordedDecision = Boolean(outcome || claim.status === 'decision_recorded');

  return (
    <div className="p-5">
      <p className="ua-text-metadata">Decision rail</p>
      <h2 className="ua-text-section-title mt-2">Merchant action</h2>
      <p className="ua-text-caption-role mt-2">
        Recommendations are advisory. A merchant decision is recorded separately with its evidence and audit receipt.
      </p>

      <div className="mt-5 space-y-4">
        <section className="border-b border-[var(--ua-border-subtle)] pb-4">
          <p className="ua-text-metadata">Evidence</p>
          <p className="ua-text-working-title mt-1">{evidence ? 'Package generated' : ops.evidenceStatus}</p>
          <p className="ua-text-caption-role mt-1">{evidence ? `Reference ${evidence.reference_number}` : 'Review source records before recording an outcome.'}</p>
        </section>
        <section className="border-b border-[var(--ua-border-subtle)] pb-4">
          <p className="ua-text-metadata">Recommendation</p>
          <p className="ua-text-working-title mt-1">{ops.nextActionLabel}</p>
          <p className="ua-text-caption-role mt-1">{ops.reviewState}</p>
        </section>
        <section>
          <p className="ua-text-metadata">Merchant decision</p>
          <p className="ua-text-working-title mt-1">{hasRecordedDecision ? (outcome ? (DECISION_LABELS[outcome.decision] ?? outcome.decision) : 'Recorded') : 'Not yet recorded'}</p>
          <p className="ua-text-caption-role mt-1">Open the review workbench to confirm, re-authenticate if required, and retain the receipt.</p>
        </section>
      </div>

      <ButtonLink href={`${basePath}/${claim.id}#${action.hash}`} size="sm" className="mt-5 w-full justify-center">
        {hasRecordedDecision ? 'Review receipt' : 'Review merchant decision'}
      </ButtonLink>
    </div>
  );
}

function ClaimDetailPanel({
  claim,
  ops,
  outcome,
  evidence,
  customer,
  basePath,
}: {
  claim: ClaimRow;
  ops: ReturnType<typeof claimNextAction>;
  outcome: Outcome | null;
  evidence: EvidencePackageRow | null;
  customer: CustomerProfileSummary | null;
  basePath: '/claims' | '/cases';
}) {
  const orderRef = shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id);
  const primaryAction = casePreviewPrimaryAction(claim);

  return (
    <div className="ua-case-preview">
      <header className="ua-case-preview__identity">
        <p className="text-caption font-medium" style={{ color: "var(--ua-text-tertiary)" }}>
          Value at issue
        </p>
        <h2 className="ua-text-hero-value mt-1" style={{ color: "var(--ua-text-primary)" }}>
          {formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? "—"}
        </h2>
        <p className="mt-2 text-body-sm font-medium" style={{ color: "var(--ua-text-primary)" }}>
          {CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}
        </p>
        <p
          className="text-caption mt-0.5"
          style={{ color: "var(--ua-text-tertiary)" }}
        >
          {orderRef}
          {claim.shop_domain ? ` · ${claim.shop_domain}` : ""}
          {" · "}Filed {formatFiledDate(claim)}
          {" · "}Age {formatClaimAge(claim)}
        </p>
      </header>

      <section
        className="ua-case-preview__priority"
      >
        <p
          className="ua-text-metadata mb-0.5"
          style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
        >
          Review context
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Case state
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {ops.evidenceStatus}
            </p>
          </div>
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Waiting time
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {ops.daysWaiting == null ? "—" : `${ops.daysWaiting}d`}
            </p>
          </div>
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Next action
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {ops.nextActionLabel}
            </p>
          </div>
        </div>
        <p
          className="text-caption mt-2"
          style={{ color: "var(--ua-text-secondary)" }}
        >
          {ops.reviewState}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {claim.recovery_state && (
            <StatusBadge family="recoveryStatus" value={claim.recovery_state} tone="neutral" size="sm" />
          )}
        </div>
        <ButtonLink href={`${basePath}/${claim.id}#${primaryAction.hash}`} size="sm" className="mt-2.5 self-start">
          {primaryAction.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </ButtonLink>
      </section>

      {(claim.investigation_open_count ?? 0) > 0 || claim.investigation_latest_response ? (
        <section className="ua-case-preview__section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="ua-text-metadata"
                style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
              >
                Investigations
              </p>
              <p className="mt-1 text-body-sm font-medium" style={{ color: "var(--ua-text-primary)" }}>
                {(claim.investigation_awaiting_review_count ?? 0) > 0
                  ? `${claim.investigation_awaiting_review_count} response${claim.investigation_awaiting_review_count === 1 ? "" : "s"} ready for review`
                  : `${claim.investigation_open_count ?? 0} open · waiting on ${claim.investigation_waiting_party ?? claim.investigation_waiting_target?.replaceAll("_", " ") ?? "external evidence"}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(claim.investigation_overdue_count ?? 0) > 0 ? (
                <Badge tone="warning" size="sm">
                  {claim.investigation_overdue_count} overdue
                </Badge>
              ) : null}
              {claim.investigation_next_due_at ? (
                <Badge tone="neutral" size="sm">
                  Due {formatDateTime(claim.investigation_next_due_at)}
                </Badge>
              ) : null}
            </div>
          </div>
          {claim.investigation_evidence_gap ? (
            <p className="mt-2 text-caption" style={{ color: "var(--ua-text-secondary)" }}>
              {claim.investigation_evidence_gap}
            </p>
          ) : null}
          {claim.investigation_latest_response ? (
            <p className="mt-2 rounded-md bg-[var(--ua-surface-muted)] p-2 text-caption text-[var(--ua-text-secondary)]">
              Latest response: {claim.investigation_latest_response}
            </p>
          ) : null}
          <Link
            href={`${basePath}/${claim.id}#case-responsibility`}
            className="ua-text-working-title mt-2.5 inline-flex items-center gap-1.5 text-[var(--ua-text-primary)] underline underline-offset-2"
          >
            Open investigation <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      ) : null}

      {/* Recovery chase-up */}
      {(claim.recoverability ||
        claim.recovery_owner ||
        claim.loss_attribution) && (
        <section className="ua-case-preview__section">
          <div
            className="flex items-center justify-between gap-3"
          >
            <p
              className="ua-text-metadata"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Recovery chase-up
            </p>
            {claim.recoverability && (
              <StatusBadge family="recoverability" value={claim.recoverability} size="sm" />
            )}
          </div>
          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p
                  className="text-caption"
                  style={{ color: "var(--ua-text-tertiary)" }}
                >
                  Partner
                </p>
                <p
                  className="text-body-sm font-medium"
                  style={{ color: claim.recovery_owner ? "var(--ua-text-primary)" : "var(--ua-text-tertiary)" }}
                >
                  {claim.recovery_owner
                    ? (LIKELY_OWNER_LABELS[
                        claim.recovery_owner as keyof typeof LIKELY_OWNER_LABELS
                      ] ?? claim.recovery_owner)
                    : "Unknown"}
                </p>
              </div>
              <div>
                <p
                  className="text-caption"
                  style={{ color: "var(--ua-text-tertiary)" }}
                >
                  Attribution
                </p>
                <p
                  className="text-body-sm font-medium"
                  style={{ color: claim.loss_attribution ? "var(--ua-text-primary)" : "var(--ua-text-tertiary)" }}
                >
                  {claim.loss_attribution
                    ? (LOSS_ATTRIBUTION_DISPLAY[
                        claim.loss_attribution as keyof typeof LOSS_ATTRIBUTION_DISPLAY
                      ] ?? claim.loss_attribution)
                    : "Unclear"}
                </p>
              </div>
            </div>
            {claim.recovery_next_action && (
              <p
                className="text-caption"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                {humanizeEvidenceProse(claim.recovery_next_action)}
              </p>
            )}
            {claim.recovery_required_evidence &&
              claim.recovery_required_evidence.length > 0 && (
                <p
                  className="text-caption"
                  style={{ color: "var(--ua-text-tertiary)" }}
                >
                  Evidence needed:{" "}
                  {claim.recovery_required_evidence
                    .map(humanizeEvidenceKey)
                    .join(", ")}
                </p>
              )}
          </div>
        </section>
      )}

      {/* Evidence package */}
      <section className="ua-case-preview__section">
        <div
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-3.5 w-3.5"
              style={{ color: "var(--ua-text-primary)" }}
            />
            <p
              className="ua-text-metadata"
              style={{ color: "var(--ua-text-primary)", letterSpacing: "0.06em" }}
            >
              Evidence package
            </p>
          </div>
        </div>
        <div className="mt-3">
          {evidence ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <EvidenceRow
                  state="confirmed"
                  text={
                    <span className="font-mono font-semibold text-[var(--ua-text-primary)]">
                      {evidence.reference_number}
                    </span>
                  }
                  timestamp={formatDateAbsolute(new Date(evidence.generated_at))}
                  className="text-caption"
                />
              </div>
              <ButtonLink
                href={`${basePath}/${claim.id}#case-evidence`}
                size="sm"
                variant="secondary"
                className="shrink-0"
                leadingIcon={<FileText className="h-3.5 w-3.5" />}
              >
                Open evidence package
              </ButtonLink>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p
                className="text-caption"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                {missingEvidenceCopy(claim)}
              </p>
              <Link
                href={`${basePath}/${claim.id}#case-evidence`}
                className="ua-text-working-title shrink-0 hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Review case evidence
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Customer identity */}
      {customer && (
        <section className="ua-case-preview__section">
          <div
            className="flex items-center justify-between"
          >
            <p
              className="ua-text-metadata"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Customer
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="ua-text-working-title truncate"
                  style={{ color: "var(--ua-text-primary)" }}
                >
                  {customerDisplayName(customer)}
                </p>
                {customer.primary_email ? (
                  <p
                    className="mt-1 text-caption truncate"
                    style={{ color: "var(--ua-text-tertiary)" }}
                  >
                    {customer.primary_email}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/customers/${customer.id}`}
                className="ua-text-working-title shrink-0 inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Profile <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Merchant-recorded outcome (if any) */}
      {outcome && (
        <section className="ua-case-preview__section">
          <div
            className="flex items-center gap-2"
          >
            <Clock
              className="h-3.5 w-3.5"
              style={{ color: "var(--ua-text-tertiary)" }}
            />
            <p
              className="ua-text-metadata"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Merchant-recorded outcome
            </p>
          </div>
          <div className="mt-3">
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {DECISION_LABELS[outcome.decision] ?? outcome.decision}
            </p>
            {outcome.outcome && outcome.outcome !== outcome.decision && (
              <p
                className="text-caption mt-0.5"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                {outcomeLabel(outcome.outcome)}
              </p>
            )}
            <p
              className="text-caption mt-1"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Updated {formatDateAbsolute(new Date(outcome.updated_at))}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
