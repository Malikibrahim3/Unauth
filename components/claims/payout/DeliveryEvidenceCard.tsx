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
        borderColor: "#eae8e5",
        background: "#fff",
      }}
    >
      <p
        className="text-[11px] font-medium leading-4 text-[#64686d] mb-3"
        style={{ color: "#64686d" }}
      >
        Delivery evidence
      </p>
      <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: "#1c1f23" }}>
        {line}
      </p>
      <dl className="text-[10.5px] leading-4 text-[#6f6a63] mt-3 grid gap-2 sm:grid-cols-2">
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
        className="mt-3 flex flex-wrap gap-2 text-[length:10.5px]"
        style={{ color: "#6f6a63" }}
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
      <dt style={{ color: "#6f6a63" }}>{label}</dt>
      <dd className="font-medium" style={{ color: "#64686d" }}>
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
      style={{ borderColor: "#eae8e5" }}
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
