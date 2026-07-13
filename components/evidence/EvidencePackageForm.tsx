"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { EvidencePackageFormFields } from "@/components/evidence/EvidencePackageFormFields";
import {
  EvidencePackageFormEmptyOrders,
  EvidencePackageFormIntro,
  EvidencePackageFormLoadingState,
  EvidencePackageFormNoClaimsBanner,
} from "@/components/evidence/EvidencePackageFormStates";
import type {
  Ce3CheckResponse,
  EvidencePackageFormProps,
  OrdersResponse,
} from "@/components/evidence/evidencePackageFormTypes";

export type { EvidencePackageFormProps } from "@/components/evidence/evidencePackageFormTypes";

export function EvidencePackageForm({
  profileId,
  preselectedOrderId = "",
  showIntro = true,
  onCancel,
  onSuccess,
}: EvidencePackageFormProps) {
  const router = useRouter();
  const [userOrderId, setUserOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previousPreselectedOrderId, setPreviousPreselectedOrderId] =
    useState(preselectedOrderId);

  if (preselectedOrderId !== previousPreselectedOrderId) {
    setPreviousPreselectedOrderId(preselectedOrderId);
    setUserOrderId("");
  }

  const { data: ordersData, loading: loadingOrders } =
    useFetchJson<OrdersResponse>(`/api/customers/${profileId}/orders`, {
      parse: async (response) => {
        if (!response.ok) return { orders: [] };
        return response.json() as Promise<OrdersResponse>;
      },
    });
  const orders = ordersData?.orders ?? [];
  const autoOrderId =
    !preselectedOrderId && !loadingOrders && orders.length > 0
      ? orders[orders.length - 1].id
      : "";
  const selectedOrderId = preselectedOrderId || userOrderId || autoOrderId;

  const { data: ce3Data, loading: priorMatchChecking } =
    useFetchJson<Ce3CheckResponse>(
      selectedOrderId
        ? `/api/evidence/ce3-check?profileId=${profileId}&orderId=${selectedOrderId}`
        : null,
      {
        parse: async (response) => {
          if (!response.ok) return {};
          return response.json() as Promise<Ce3CheckResponse>;
        },
      },
    );
  const priorMatchPreview =
    ce3Data?.hasPriorMatchEvidence === true
      ? "likely"
      : ce3Data?.hasPriorMatchEvidence === false
        ? "unlikely"
        : "unknown";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrderId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerProfileId: profileId,
          disputedOrderId: selectedOrderId,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to compile signal data");
        return;
      }
      const { packageId } = await res.json();
      if (onSuccess) {
        onSuccess(packageId);
      } else {
        router.push("/claims");
      }
    } catch {
      setError("Failed to compile signal data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasEligibleOrders = orders.some((o) => o.refund_claimed);
  const canSubmit = !!selectedOrderId && !loading && !loadingOrders;

  const packageIncludes = [
    { label: "Customer identity record", available: true },
    { label: "Order history (all known orders)", available: true },
    { label: "Identity signals observed", available: true },
    {
      label: "Prior matching transactions (if any)",
      available: priorMatchPreview === "likely",
      pending: priorMatchPreview === "unknown",
    },
    { label: "Merchant notes", available: !!notes.trim(), optional: true },
  ];

  return (
    <div
      className={
        showIntro
          ? "p-8 max-w-2xl mx-auto"
          : "px-[var(--space-5)] py-[var(--space-4)]"
      }
    >
      <EvidencePackageFormIntro showIntro={showIntro} />
      <EvidencePackageFormLoadingState loadingOrders={loadingOrders} />
      <EvidencePackageFormEmptyOrders
        profileId={profileId}
        loadingOrders={loadingOrders}
        hasOrders={orders.length > 0}
        onCancel={onCancel}
      />
      <EvidencePackageFormNoClaimsBanner
        loadingOrders={loadingOrders}
        hasOrders={orders.length > 0}
        hasEligibleOrders={hasEligibleOrders}
      />

      {!loadingOrders && orders.length > 0 ? (
        <EvidencePackageFormFields
          profileId={profileId}
          orders={orders}
          selectedOrderId={selectedOrderId}
          notes={notes}
          loading={loading}
          error={error}
          priorMatchPreview={priorMatchPreview}
          priorMatchChecking={priorMatchChecking}
          packageIncludes={packageIncludes}
          canSubmit={canSubmit}
          onOrderChange={setUserOrderId}
          onNotesChange={setNotes}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </div>
  );
}
