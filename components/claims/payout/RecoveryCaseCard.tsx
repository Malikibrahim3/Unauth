"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import { countLabel, financialStageLabel } from "@/lib/ui/labels";
import { formatCurrencyNullable, formatDate } from "@/lib/utils/format";
import { RECOVERY_TYPE_LABELS } from "@/lib/partners/types";
import { humanizeEvidenceKey } from "@/components/claims/payout/payoutCopy";
import {
  RECOVERY_OWNER_LABELS,
  RECOVERY_STATUS_LABELS,
  type RecoveryCase,
} from "@/lib/recoveries/types";
import type { SupportPayoutCase } from "@/lib/payouts/types";
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from "@/lib/investigations/client";

function dateLabel(value: string | null | undefined) {
  if (!value) return "No date set";
  return formatDate(value);
}

export function RecoveryCaseCard({
  recoveryCase,
  payoutCase,
  loading,
  onRefresh,
  caseId,
  canManage = false,
}: {
  recoveryCase: RecoveryCase | null;
  payoutCase: SupportPayoutCase | null;
  loading: boolean;
  onRefresh: () => void;
  caseId: string;
  canManage?: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const handoffKeyRef = useRef(
    newInvestigationIdempotencyKey(`recovery-handoff:${caseId}`),
  );
  const recovery = payoutCase?.recovery ?? null;
  const preventionOnly =
    recovery?.recoverability === "not_recoverable" ||
    recovery?.likelyOwner === "merchant";
  const externalOwner =
    recovery != null &&
    recovery.likelyOwner !== "merchant" &&
    recovery.likelyOwner !== "unknown";
  const canOpenRecovery =
    !preventionOnly &&
    externalOwner &&
    (recovery?.recoverability === "recoverable" ||
      recovery?.recoverability === "possibly_recoverable");

  async function openRecoveryHandoff() {
    if (!canOpenRecovery || !canManage || opening) return;
    setOpening(true);
    setHandoffMessage(null);
    const result = await mutateInvestigation(
      `/api/claims/${encodeURIComponent(caseId)}/recovery-handoff`,
      {},
      handoffKeyRef.current,
    );
    setOpening(false);
    if (!result.ok) {
      setHandoffMessage(result.error);
      return;
    }
    setHandoffMessage(
      "Recovery handoff opened. No external claim or partner submission was performed.",
    );
    onRefresh();
  }

  return (
    <Panel as="section" variant="panel" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-caption font-semibold"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Recovery / Chase-Up
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Linked operational tracking for eligible recovery.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={
            loading || opening
              ? "Loading recovery route"
              : !recoveryCase && canOpenRecovery && canManage
                ? "Open recovery handoff"
                : "Check recovery route"
          }
          onClick={
            !recoveryCase && canOpenRecovery && canManage
              ? () => void openRecoveryHandoff()
              : onRefresh
          }
          loading={loading || opening}
          leadingIcon={<RefreshCw />}
        >
          {!recoveryCase && canOpenRecovery && canManage
            ? "Open recovery handoff"
            : "Check route"}
        </Button>
      </div>

      {recoveryCase ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div>
              <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
                Status
              </p>
              <p
                className="font-semibold"
                style={{ color: "var(--ua-text-primary)" }}
              >
                {RECOVERY_STATUS_LABELS[recoveryCase.status]}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
                Owner
              </p>
              <p
                className="font-semibold"
                style={{ color: "var(--ua-text-primary)" }}
              >
                {RECOVERY_OWNER_LABELS[recoveryCase.owner_type]}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
                {financialStageLabel('eligible_recovery')}
              </p>
              <p className="font-sans tabular-nums" style={{ color: "var(--ua-text-primary)" }}>
                {formatCurrencyNullable(
                  recoveryCase.estimated_recoverable_max,
                  recoveryCase.currency,
                ) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
                Deadline
              </p>
              <p style={{ color: "var(--ua-text-primary)" }}>
                {dateLabel(recoveryCase.deadline_at)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
                Provider claim
              </p>
              <p className="font-semibold" style={{ color: "var(--ua-text-primary)" }}>
                {(recoveryCase.provider_claim_stage ?? 'prepared').replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge size="sm">{RECOVERY_TYPE_LABELS[recoveryCase.recovery_type]}</Badge>
            <Badge tone={recoveryCase.evidence_complete ? "success" : "warning"} size="sm" dot>
              {recoveryCase.evidence_complete
                ? "Evidence complete"
                : countLabel(recoveryCase.evidence_missing.length, 'item', 'items') + ' missing'}
            </Badge>
            {recoveryCase.partner?.name ? (
              <Badge size="sm">{recoveryCase.partner.name}</Badge>
            ) : null}
          </div>
          {recoveryCase.evidence_missing.length > 0 ? (
            <div className="mt-3">
              <p
                className="mb-1 text-xs"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                Missing items
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recoveryCase.evidence_missing.map((item) => (
                  <Badge key={item} size="sm">{humanizeEvidenceKey(item)}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          <Link
            href="/recoveries"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: "var(--ua-action-primary)" }}
          >
            Open recovery board{" "}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      ) : canOpenRecovery && recovery ? (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p
              className="font-semibold"
              style={{ color: "var(--ua-text-primary)" }}
            >
              Recovery case can be opened
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--ua-text-secondary)" }}
            >
              {RECOVERY_OWNER_LABELS[
                recovery.likelyOwner as keyof typeof RECOVERY_OWNER_LABELS
              ] ?? recovery.likelyOwner}
              {" · "}
              {recovery.suggestedNextAction}
            </p>
          </div>
          {recovery.requiredEvidence.length > 0 ? (
            <div>
              <p
                className="mb-1 text-xs"
                style={{ color: "var(--ua-text-tertiary)" }}
              >
                Required for recovery
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recovery.requiredEvidence.map((item) => (
                  <Badge key={item} size="sm">{humanizeEvidenceKey(item)}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
            Confirm responsibility and a canonical loss, then explicitly open
            the internal recovery handoff. Unauth will not submit a provider
            claim automatically.
          </p>
          {handoffMessage ? (
            <p role="status" className="text-xs" style={{ color: "var(--ua-text-secondary)" }}>
              {handoffMessage}
            </p>
          ) : null}
        </div>
      ) : loading ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ua-text-secondary)" }}>
          Loading recovery route…
        </p>
      ) : preventionOnly ? (
        <p className="mt-4 text-sm" style={{ color: "var(--ua-text-secondary)" }}>
          Prevention opportunity: this loss appears unrecoverable but can inform
          future policy or partner review.
        </p>
      ) : (
        <p className="mt-4 text-sm" style={{ color: "var(--ua-text-secondary)" }}>
          No external recovery route currently identified.
        </p>
      )}
    </Panel>
  );
}
