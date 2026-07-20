"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge, Button, PanelCard } from "@/components/ui";
import { formatCurrencyNullable, formatDate } from "@/lib/utils/format";
import { RECOVERY_TYPE_LABELS } from "@/lib/partners/types";
import { humanizeEvidenceKey } from "@/components/claims/payout/payoutCopy";
import {
  RECOVERY_OWNER_LABELS,
  RECOVERY_STATUS_LABELS,
  type RecoveryCase,
} from "@/lib/recoveries/types";
import type { SupportPayoutCase } from "@/lib/payouts/types";

function dateLabel(value: string | null | undefined) {
  if (!value) return "No date set";
  return formatDate(value);
}

export function RecoveryCaseCard({
  recoveryCase,
  payoutCase,
  loading,
  onRefresh,
}: {
  recoveryCase: RecoveryCase | null;
  payoutCase: SupportPayoutCase | null;
  loading: boolean;
  onRefresh: () => void;
}) {
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

  return (
    <PanelCard as="section" variant="app" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-caption font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Recovery / Chase-Up
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Linked operational tracking for recoverable payout losses.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          loading={loading}
          leadingIcon={<RefreshCw />}
        >
          Check route
        </Button>
      </div>

      {recoveryCase ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Status
              </p>
              <p
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {RECOVERY_STATUS_LABELS[recoveryCase.status]}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Owner
              </p>
              <p
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {RECOVERY_OWNER_LABELS[recoveryCase.owner_type]}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Recoverable
              </p>
              <p className="font-mono" style={{ color: "var(--text-primary)" }}>
                {formatCurrencyNullable(
                  recoveryCase.estimated_recoverable_max,
                  recoveryCase.currency,
                ) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Deadline
              </p>
              <p style={{ color: "var(--text-primary)" }}>
                {dateLabel(recoveryCase.deadline_at)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge size="sm">{RECOVERY_TYPE_LABELS[recoveryCase.recovery_type]}</Badge>
            <Badge tone={recoveryCase.evidence_complete ? "success" : "warning"} size="sm" dot>
              {recoveryCase.evidence_complete
                ? "Evidence complete"
                : `${recoveryCase.evidence_missing.length} missing`}
            </Badge>
            {recoveryCase.partner?.name ? (
              <Badge size="sm">{recoveryCase.partner.name}</Badge>
            ) : null}
          </div>
          {recoveryCase.evidence_missing.length > 0 ? (
            <div className="mt-3">
              <p
                className="mb-1 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Missing evidence
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
            style={{ color: "var(--accent)" }}
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
              style={{ color: "var(--text-primary)" }}
            >
              Recovery case can be opened
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
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
                style={{ color: "var(--text-tertiary)" }}
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
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Use “Check route” to open the recovery case and add it to the
            recovery board.
          </p>
        </div>
      ) : preventionOnly ? (
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Prevention opportunity: this loss appears unrecoverable but can inform
          future policy or partner review.
        </p>
      ) : (
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          No external recovery route currently identified.
        </p>
      )}
    </PanelCard>
  );
}
