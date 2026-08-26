"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  Clock,
  Maximize2,
  X,
} from "lucide-react";
import { StatusPill, SlaPill } from "./claimsPageUi";
import {
  Badge,
  ButtonLink,
  DecisionBracket,
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
} from "./claimsPageData";
import { claimNextAction } from "./claimsPageLogic";

type Outcome = { decision: string; outcome: string; updated_at: string };

type Props = {
  claims: ClaimRow[];
  outcomesRecord: Record<string, Outcome>;
  evidenceRecord: Record<string, EvidencePackageRow | null>;
  customersRecord: Record<string, CustomerProfileSummary>;
  currentUserId: string;
  initialSelectedCaseId?: string | null;
  basePath?: '/cases';
};

function customerDisplayName(
  customer: CustomerProfileSummary | null | undefined,
) {
  if (!customer) return "Identity pending";
  return customer.names?.[0] ?? customer.primary_email ?? "Identity pending";
}

function resolveInitialSelection(
  claims: ClaimRow[],
  initialSelectedCaseId?: string | null,
): string | null {
  if (initialSelectedCaseId && claims.some((c) => c.id === initialSelectedCaseId)) {
    return initialSelectedCaseId;
  }
  return null;
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
  initialSelectedCaseId,
  basePath = '/cases',
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialSelection(claims, initialSelectedCaseId),
  );
  useEffect(() => {
    if (selectedId && claims.some((claim) => claim.id === selectedId)) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('selected') !== selectedId) {
        url.searchParams.set('selected', selectedId);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }
    // Preserve continuity when a URL-backed selection is filtered out. The
    // registry still opens with no selection by default, but an operator who
    // was already inspecting a case should land on the first remaining row
    // instead of being left with a stale, invisible selection.
    const nextId = resolveInitialSelection(claims, initialSelectedCaseId)
      ?? (selectedId ? claims[0]?.id ?? null : null);
    setSelectedId(nextId);
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set('selected', nextId);
    else url.searchParams.delete('selected');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [claims, initialSelectedCaseId, selectedId]);

  function selectClaim(id: string) {
    setSelectedId(id || null);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('selected', id);
    else url.searchParams.delete('selected');
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
    <div className="ua-case-queue" data-preview-open={selected ? "true" : undefined}>
      {/* Left review list */}
      <div
        className="ua-case-queue__list shrink-0 overflow-y-auto border-b"
        role="grid"
        aria-label="Cases"
      >
        <div className="ua-case-queue__header" role="row">
          <span role="columnheader">Case</span>
          <span role="columnheader">Customer</span>
          <span role="columnheader">Order / ticket</span>
          <span role="columnheader">Amount</span>
          <span role="columnheader">State</span>
          <span role="columnheader">Evidence posture / responsibility</span>
          <span role="columnheader">Claim readiness / deadline</span>
          <span role="columnheader">Provider / money</span>
        </div>
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
              aria-selected={isSelected}
              aria-controls="payout-case-preview"
              className="ua-case-queue__item w-full border-b text-left transition-colors"
              data-selected={isSelected || undefined}
              role="row"
            >
              <span className="ua-case-queue__cell ua-case-queue__cell--case" role="gridcell">
                <span className="ua-case-queue__primary font-mono">{shortRef(c.id, c.id)}</span>
                <span>{CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="ua-case-queue__primary">{customerDisplayName(customer)}</span>
                <span>{customer?.primary_email ?? "Email unavailable"}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="ua-case-queue__primary font-mono">{shortRef(c.order_ref ?? c.shopify_order_id, c.id)}</span>
                <span>{sourceSystemLabel(c)}</span>
              </span>
              <span className="ua-case-queue__cell ua-case-queue__cell--amount" role="gridcell">
                <span className="ua-case-queue__primary num">{formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined) ?? "Unavailable"}</span>
                <span>{c.currency ?? "Currency unavailable"}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="flex flex-wrap items-center gap-1"><StatusPill status={c.status} /><SlaPill claim={c} uniform={uniformSlaState} /></span>
                <span>{c.assigned_to ? "Assigned" : "Unassigned"}{ops.daysWaiting != null ? ` · ${ops.daysWaiting}d waiting` : ""}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="ua-case-queue__primary">{c.evidence_posture ? c.evidence_posture.replaceAll("_", " ") : "Not assessable"}</span>
                <span>{c.apparent_responsibility ? `${c.apparent_responsibility.replaceAll("_", " ")} · merchant confirmation separate` : c.evidence_posture === "strong" ? "All required source gates met" : "Recommendation only"}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="ua-case-queue__primary">{c.claim_readiness ? c.claim_readiness.replaceAll("_", " ") : "Not assessable"}</span>
                <span>{c.claim_deadline ? `Deadline ${formatDateAbsolute(c.claim_deadline)}` : "Deadline unavailable"}</span>
              </span>
              <span className="ua-case-queue__cell" role="gridcell">
                <span className="ua-case-queue__primary">{c.provider_position && c.provider_position !== "not_recorded" ? c.provider_position.replaceAll("_", " ") : "Provider not recorded"}</span>
                <span>{c.money_outcome ? c.money_outcome.replaceAll("_", " ") : "Money outcome unavailable"} · Updated {formatDateAbsolute(c.updated_at)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Row selection stays in context. Expand opens the canonical full case page. */}
      {selected && selectedOps ? (
        <aside
          id="payout-case-preview"
          className="ua-case-queue__preview min-w-0"
          role="region"
          aria-label="Selected case preview"
          data-overlay-id="case-context-drawer"
          data-signal-rail="true"
        >
          <ClaimDetailPanel
            claim={selected}
            ops={selectedOps}
            outcome={selectedOutcome}
            evidence={selectedEvidence}
            customer={selectedCustomer}
            basePath={basePath}
            onClose={() => selectClaim('')}
          />
        </aside>
      ) : null}

      <aside className="ua-case-queue__decision-rail" aria-label="Decision rail" data-signal-rail="true" hidden={!selected}>
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
  basePath: '/cases';
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

      <DecisionBracket
        className="mt-5"
        title="Evidence to merchant decision"
        description="Each authority stays explicit; an open node is not a completed decision."
        items={[
          {
            key: 'evidence',
            authority: 'fact',
            label: 'Evidence set',
            value: evidence ? 'Package generated' : ops.evidenceStatus,
            meta: evidence ? `Reference ${evidence.reference_number}` : 'Review source records',
            state: evidence ? 'recorded' : 'partial',
          },
          {
            key: 'recommendation',
            authority: 'recommendation',
            label: 'Advisory next action',
            value: ops.nextActionLabel,
            meta: ops.reviewState,
            state: 'known',
          },
          {
            key: 'decision',
            authority: 'merchant-decision',
            label: 'Recorded by the merchant',
            value: hasRecordedDecision ? (outcome ? (DECISION_LABELS[outcome.decision] ?? outcome.decision) : 'Recorded') : 'Not yet recorded',
            meta: hasRecordedDecision ? 'Audit receipt retained' : 'Open the review workbench',
            state: hasRecordedDecision ? 'recorded' : 'missing',
          },
          {
            key: 'outcome',
            authority: 'ledger-outcome',
            label: 'Recorded customer outcome',
            value: outcome ? outcomeLabel(outcome.outcome) : 'No outcome recorded',
            state: outcome ? 'recorded' : 'missing',
          },
        ]}
      />

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
  onClose,
}: {
  claim: ClaimRow;
  ops: ReturnType<typeof claimNextAction>;
  outcome: Outcome | null;
  evidence: EvidencePackageRow | null;
  customer: CustomerProfileSummary | null;
  basePath: '/cases';
  onClose: () => void;
}) {
  const orderRef = shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id);
  const caseRef = shortRef(claim.id, claim.id);
  const primaryAction = casePreviewPrimaryAction(claim);

  return (
    <div className="ua-case-preview">
      <header className="ua-case-preview__identity">
        <div className="ua-case-preview__identity-actions">
          <Link
            href={`${basePath}/${claim.id}?return=${encodeURIComponent(`${basePath}?selected=${claim.id}`)}`}
            scroll
            aria-label="Expand case"
            title="Expand case"
          >
            <Maximize2 size={14} aria-hidden="true" />
            <span>Expand</span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Close case preview" title="Close case preview">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <p className="text-caption font-medium" style={{ color: "var(--uo-route-text-tertiary)" }}>
          Value at issue
        </p>
        <h2 className="ua-text-hero-value mt-1" style={{ color: "var(--uo-route-text-primary)" }}>
          {formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? "—"}
        </h2>
        <p className="mt-2 text-body-sm font-medium" style={{ color: "var(--uo-route-text-primary)" }}>
          {CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type}
        </p>
        <p
          className="text-caption mt-0.5"
          style={{ color: "var(--uo-route-text-tertiary)" }}
        >
          {caseRef} · {orderRef}
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
          style={{ color: "var(--uo-route-text-tertiary)", letterSpacing: "0.06em" }}
        >
          Review context
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--uo-route-text-tertiary)" }}
            >
              Case state
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--uo-route-text-primary)" }}
            >
              {ops.evidenceStatus}
            </p>
          </div>
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--uo-route-text-tertiary)" }}
            >
              Waiting time
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--uo-route-text-primary)" }}
            >
              {ops.daysWaiting == null ? "—" : `${ops.daysWaiting}d`}
            </p>
          </div>
          <div>
            <p
              className="text-caption"
              style={{ color: "var(--uo-route-text-tertiary)" }}
            >
              Next action
            </p>
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--uo-route-text-primary)" }}
            >
              {ops.nextActionLabel}
            </p>
          </div>
        </div>
        <p
          className="text-caption mt-2"
          style={{ color: "var(--uo-route-text-secondary)" }}
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
                style={{ color: "var(--uo-route-text-tertiary)", letterSpacing: "0.06em" }}
              >
                Investigations
              </p>
              <p className="mt-1 text-body-sm font-medium" style={{ color: "var(--uo-route-text-primary)" }}>
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
            <p className="mt-2 text-caption" style={{ color: "var(--uo-route-text-secondary)" }}>
              {claim.investigation_evidence_gap}
            </p>
          ) : null}
          {claim.investigation_latest_response ? (
            <p className="mt-2 rounded-md bg-[var(--uo-route-surface-muted)] p-2 text-caption text-[var(--uo-route-text-secondary)]">
              Latest response: {claim.investigation_latest_response}
            </p>
          ) : null}
          <Link
            href={`${basePath}/${claim.id}#case-responsibility`}
            className="ua-text-working-title mt-2.5 inline-flex items-center gap-1.5 text-[var(--uo-route-text-primary)] underline underline-offset-2"
          >
            Open investigation <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      ) : null}

      {/* Recovery chase-up */}
      {(claim.recoverability ||
        claim.recovery_owner ||
        claim.loss_attribution ||
        claim.attribution_confidence) && (
        <section className="ua-case-preview__section">
          <div
            className="flex items-center justify-between gap-3"
          >
            <p
              className="ua-text-metadata"
              style={{ color: "var(--uo-route-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Recovery chase-up
            </p>
            {claim.recoverability && (
              <StatusBadge family="recoverability" value={claim.recoverability} size="sm" />
            )}
          </div>
          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <p
                  className="text-caption"
                  style={{ color: "var(--uo-route-text-tertiary)" }}
                >
                  Partner
                </p>
                <p
                  className="text-body-sm font-medium"
                  style={{ color: claim.recovery_owner ? "var(--uo-route-text-primary)" : "var(--uo-route-text-tertiary)" }}
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
                  style={{ color: "var(--uo-route-text-tertiary)" }}
                >
                  Attribution
                </p>
                <p
                  className="text-body-sm font-medium"
                  style={{ color: claim.loss_attribution ? "var(--uo-route-text-primary)" : "var(--uo-route-text-tertiary)" }}
                >
                  {claim.loss_attribution
                    ? (LOSS_ATTRIBUTION_DISPLAY[
                        claim.loss_attribution as keyof typeof LOSS_ATTRIBUTION_DISPLAY
                      ] ?? claim.loss_attribution)
                    : "Unclear"}
                </p>
              </div>
              <div>
                <p
                  className="text-caption"
                  style={{ color: "var(--uo-route-text-tertiary)" }}
                >
                  Attribution confidence
                </p>
                <p
                  className="text-body-sm font-medium"
                  style={{ color: claim.attribution_confidence ? "var(--uo-route-text-primary)" : "var(--uo-route-text-tertiary)" }}
                >
                  {claim.attribution_confidence
                    ? humanizeEvidenceProse(claim.attribution_confidence).replace(/^./, (character) => character.toUpperCase())
                    : "Unavailable"}
                </p>
              </div>
            </div>
            {claim.recovery_next_action && (
              <p
                className="text-caption"
                style={{ color: "var(--uo-route-text-secondary)" }}
              >
                {humanizeEvidenceProse(claim.recovery_next_action)}
              </p>
            )}
            {claim.recovery_required_evidence &&
              claim.recovery_required_evidence.length > 0 && (
                <p
                  className="text-caption"
                  style={{ color: "var(--uo-route-text-tertiary)" }}
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
              style={{ color: "var(--uo-route-text-primary)" }}
            />
            <p
              className="ua-text-metadata"
              style={{ color: "var(--uo-route-text-primary)", letterSpacing: "0.06em" }}
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
                    <span className="font-mono font-semibold text-[var(--uo-route-text-primary)]">
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
                style={{ color: "var(--uo-route-text-tertiary)" }}
              >
                {missingEvidenceCopy(claim)}
              </p>
              <Link
                href={`${basePath}/${claim.id}#case-evidence`}
                className="ua-text-working-title shrink-0 hover:underline"
                style={{ color: "var(--uo-route-action-primary)" }}
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
              style={{ color: "var(--uo-route-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Customer
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="ua-text-working-title truncate"
                  style={{ color: "var(--uo-route-text-primary)" }}
                >
                  {customerDisplayName(customer)}
                </p>
                {customer.primary_email ? (
                  <p
                    className="mt-1 text-caption truncate"
                    style={{ color: "var(--uo-route-text-tertiary)" }}
                  >
                    {customer.primary_email}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/customers/${customer.id}`}
                className="ua-text-working-title shrink-0 inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--uo-route-action-primary)" }}
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
              style={{ color: "var(--uo-route-text-tertiary)" }}
            />
            <p
              className="ua-text-metadata"
              style={{ color: "var(--uo-route-text-tertiary)", letterSpacing: "0.06em" }}
            >
              Merchant-recorded outcome
            </p>
          </div>
          <div className="mt-3">
            <p
              className="text-body-sm font-medium"
              style={{ color: "var(--uo-route-text-primary)" }}
            >
              {DECISION_LABELS[outcome.decision] ?? outcome.decision}
            </p>
            {outcome.outcome && outcome.outcome !== outcome.decision && (
              <p
                className="text-caption mt-0.5"
                style={{ color: "var(--uo-route-text-secondary)" }}
              >
                {outcomeLabel(outcome.outcome)}
              </p>
            )}
            <p
              className="text-caption mt-1"
              style={{ color: "var(--uo-route-text-tertiary)" }}
            >
              Updated {formatDateAbsolute(new Date(outcome.updated_at))}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
