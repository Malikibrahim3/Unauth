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
import { formatClaimAge, formatFiledDate } from "@/lib/claims/sla";
import {
  LIKELY_OWNER_LABELS,
  LOSS_ATTRIBUTION_DISPLAY,
  PAYOUT_CASE_NEXT_ACTION_LABELS,
  PAYOUT_CASE_STATUS_LABELS,
} from "@/lib/payouts/types";
import {
  humanizeEvidenceKey,
  humanizeEvidenceProse,
} from "@/components/claims/payout/payoutCopy";
import { shortRef } from "@/lib/ui/displayRef";
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  STATUS_META,
  humanizeEnumValue,
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

function workflowStatusLabel(status: string): string {
  return (
    PAYOUT_CASE_STATUS_LABELS[
      status as keyof typeof PAYOUT_CASE_STATUS_LABELS
    ] ??
    STATUS_META[status]?.label ??
    humanizeEnumValue(status)
  );
}

function sourceSystemLabel(claim: ClaimRow): string {
  if (claim.source_ticket_ref) return `Helpdesk #${claim.source_ticket_ref}`;
  if (claim.shopify_order_id) return "Commerce order";
  return "Manual case";
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

  return (
    <div
      className="flex flex-col lg:flex-row"
      style={{ minHeight: 560, borderTop: "1px solid var(--ua-border-subtle)" }}
    >
      {/* Left review list */}
      <div
        className="shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r max-h-[420px] lg:max-h-none w-full lg:w-[360px]"
        style={{
          borderColor: "var(--ua-border-subtle)",
          background: "var(--ua-surface-primary)",
        }}
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
              className="w-full text-left border-b transition-colors"
              style={{
                padding: "11px 14px",
                borderColor: "var(--ua-border-subtle)",
                background: isSelected
                  ? "color-mix(in srgb, var(--ua-action-primary) 13%, var(--ua-surface-primary))"
                  : "transparent",
                borderLeft: isSelected
                  ? "2px solid var(--ua-text-primary)"
                  : "2px solid transparent",
              }}
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
                className="text-caption font-mono mb-1.5"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                {c.shopify_order_id ?? shortRef(null, c.id)}&nbsp;·&nbsp;
                {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
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
                className="text-[length:var(--ua-text-micro-size)] mb-1.5"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                {sourceSystemLabel(c)}
                {` · ${c.assigned_to ? "Assigned" : "Unassigned"}`}
                {ops.daysWaiting != null
                  ? ` · ${ops.daysWaiting}d waiting`
                  : ""}
              </p>
              {(c.investigation_open_count ?? 0) > 0 ? (
                <p
                  className="mb-1.5 text-[length:var(--ua-text-micro-size)]"
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
                <SlaPill claim={c} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Right detail panel */}
      <div
        id="payout-case-preview"
        className="min-w-0 flex-1 overflow-y-auto"
        style={{ background: "var(--ua-surface-muted)" }}
      >
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
  const orderRef = claim.shopify_order_id ?? shortRef(null, claim.id);

  return (
    <div className="p-5 space-y-5">
      {/* Claim header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <StatusPill status={claim.status} />
          <SlaPill claim={claim} />
          {claim.amount_at_risk != null && (
            <span
              className="text-caption font-sans font-semibold tabular-nums"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {formatCurrencyNullable(
                claim.amount_at_risk,
                claim.currency ?? undefined,
              )}
            </span>
          )}
        </div>
        <h2 className="t-heading" style={{ color: "var(--ua-text-primary)" }}>
          {CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}
        </h2>
        <p
          className="text-caption mt-0.5"
          style={{ color: "var(--ua-text-tertiary)" }}
        >
          {orderRef}
          {claim.shop_domain ? ` · ${claim.shop_domain}` : ""}
          {" · "}Filed {formatFiledDate(claim)}
          {" · "}Age {formatClaimAge(claim)}
        </p>
      </div>

      {/* Workflow state — primary call-out */}
      <section
        className="rounded-lg border px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--ua-surface-selected) 58%, var(--ua-surface-primary))",
          borderColor: "var(--ua-border-default)",
        }}
      >
        <p
          className="text-caption font-semibold mb-0.5"
          style={{ color: "var(--ua-text-primary)", letterSpacing: "0.06em" }}
        >
          Workflow
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Current state
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {workflowStatusLabel(claim.status)}
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
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Value at issue
            </p>
            <p
              className="text-body-sm font-sans font-semibold tabular-nums"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {formatCurrencyNullable(
                claim.amount_at_risk,
                claim.currency ?? undefined,
              ) ?? "—"}
            </p>
          </div>
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--ua-text-tertiary)" }}
            >
              Days waiting
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--ua-text-primary)" }}
            >
              {ops.daysWaiting == null ? "—" : `${ops.daysWaiting}d`}
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
          <Badge tone="neutral" size="sm">{ops.evidenceStatus}</Badge>
          {claim.next_action && (
            <Badge tone="neutral" size="sm">
              {PAYOUT_CASE_NEXT_ACTION_LABELS[
                claim.next_action as keyof typeof PAYOUT_CASE_NEXT_ACTION_LABELS
              ] ?? claim.next_action}
            </Badge>
          )}
          {claim.recovery_state && (
            <StatusBadge family="recoveryStatus" value={claim.recovery_state} tone="neutral" size="sm" />
          )}
        </div>
        <ButtonLink href={`/claims/${claim.id}#case-customer-action`} size="sm" className="mt-2.5 self-start">
          Review case <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </ButtonLink>
      </section>

      {(claim.investigation_open_count ?? 0) > 0 || claim.investigation_latest_response ? (
        <section className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="text-caption font-semibold"
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
            href={`/claims/${claim.id}#case-responsibility`}
            className="mt-2.5 inline-flex items-center gap-1.5 text-caption font-semibold text-[var(--ua-text-primary)] underline underline-offset-2"
          >
            Open investigation <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      ) : null}

      {/* Recovery chase-up */}
      {(claim.recoverability ||
        claim.recovery_owner ||
        claim.loss_attribution) && (
        <section className="border-b pb-4">
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: "var(--ua-border-subtle)" }}
          >
            <p
              className="text-caption font-semibold"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Recovery chase-up
            </p>
            {claim.recoverability && (
              <StatusBadge family="recoverability" value={claim.recoverability} size="sm" />
            )}
          </div>
          <div className="space-y-2 px-4 py-3">
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
      <section className="border-b pb-4">
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: "var(--ua-border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-3.5 w-3.5"
              style={{ color: "var(--ua-text-primary)" }}
            />
            <p
              className="text-caption font-semibold"
              style={{ color: "var(--ua-text-primary)", letterSpacing: "0.06em" }}
            >
              Evidence package
            </p>
          </div>
        </div>
        <div className="px-4 py-3">
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
                href={`/claims/${claim.id}#case-evidence`}
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
                No evidence package for this case yet.
              </p>
              <Link
                href={`/claims/${claim.id}#case-evidence`}
                className="shrink-0 text-caption font-semibold hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Open evidence review
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Customer identity */}
      {customer && (
        <section className="border-b pb-4">
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: "var(--ua-border-subtle)" }}
          >
            <p
              className="text-caption font-semibold"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Customer
            </p>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-body-sm font-semibold truncate"
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
                className="shrink-0 inline-flex items-center gap-1 text-caption font-semibold hover:underline"
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
        <section>
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b"
            style={{ borderColor: "var(--ua-border-subtle)" }}
          >
            <Clock
              className="h-3.5 w-3.5"
              style={{ color: "var(--ua-text-tertiary)" }}
            />
            <p
              className="text-caption font-semibold"
              style={{ color: "var(--ua-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Merchant-recorded outcome
            </p>
          </div>
          <div className="px-4 py-3">
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
