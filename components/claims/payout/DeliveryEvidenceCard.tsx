"use client";

import type { ClaimDecisionContext } from "@/lib/claims/decision/types";
import { formatDeliveryEvidenceLine } from "@/lib/integrations/trackingEvidenceSlice";
import { formatDateAbsolute } from "@/lib/utils/format";
import { DeliveryPhotoFinding } from "@/components/claims/investigations/DeliveryPhotoFinding";

export function DeliveryEvidenceCard({
  delivery,
  caseId,
  canManage = false,
  onFindingSaved,
}: {
  delivery: ClaimDecisionContext["delivery"];
  caseId?: string;
  canManage?: boolean;
  onFindingSaved?: () => void;
}) {
  const line = formatDeliveryEvidenceLine(delivery);
  if (!delivery) return null;

  return (
    <section
      className="rounded-md p-4 border"
      style={{
        borderColor: "var(--ua-border-subtle)",
        background: "var(--ua-surface-primary)",
      }}
    >
      <p
        className="text-caption font-semibold mb-3"
        style={{ color: "var(--ua-text-secondary)" }}
      >
        Delivery evidence
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--ua-text-primary)" }}>
        {line}
      </p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <Detail label="Carrier" value={delivery.carrier ?? "—"} />
        <Detail
          label="Tracking number"
          value={delivery.trackingNumber ?? "—"}
        />
        <Detail
          label="Status"
          value={delivery.status?.replace(/_/g, " ") ?? "—"}
        />
        <Detail label="Last scan" value={formatDateTime(delivery.lastScanAt)} />
        <Detail label="Delivered" value={formatDateTime(delivery.deliveredAt)} />
        <Detail
          label="Exceptions"
          value={
            delivery.exceptionCount > 0
              ? `${delivery.exceptionCount} event(s)`
              : "None"
          }
        />
      </dl>
      <div
        className="mt-3 flex flex-wrap gap-2 text-[length:var(--ua-text-micro-size)]"
        style={{ color: "var(--ua-text-tertiary)" }}
      >
        <CapabilityPill
          label="Delivery photo"
          state={
            delivery.deliveryPhotoAvailable
              ? "present"
              : delivery.carrierDirectConnected
                ? "unavailable"
                : "unknown"
          }
        />
        <CapabilityPill
          label="Signature"
          state={
            delivery.signatureAvailable
              ? "present"
              : delivery.carrierDirectConnected
                ? "unavailable"
                : "unknown"
          }
        />
        <CapabilityPill
          label="GPS"
          state={
            delivery.gpsSupported
              ? "present"
              : delivery.trackingProviderConnected
                ? "unsupported"
                : "unknown"
          }
        />
      </div>
      {caseId && delivery.deliveryPhotoAvailable ? (
        <DeliveryPhotoFinding
          caseId={caseId}
          finding={delivery.deliveryPhotoFinding}
          rationale={delivery.deliveryPhotoFindingRationale}
          recordedAt={delivery.deliveryPhotoFindingAt}
          canManage={canManage}
          onSaved={onFindingSaved}
        />
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: "var(--ua-text-tertiary)" }}>{label}</dt>
      <dd className="font-medium" style={{ color: "var(--ua-text-secondary)" }}>
        {value}
      </dd>
    </div>
  );
}

function CapabilityPill({
  label,
  state,
}: {
  label: string;
  state: "present" | "unavailable" | "unsupported" | "unknown";
}) {
  const copy =
    state === "present"
      ? `${label}: on file`
      : state === "unavailable"
        ? `${label}: not provided by this provider`
        : state === "unsupported"
          ? `${label}: unsupported`
          : `${label}: not tracked`;
  return (
    <span
      className="rounded-full border px-2 py-0.5"
      style={{ borderColor: "var(--ua-border-subtle)" }}
    >
      {copy}
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDateAbsolute(d);
}
