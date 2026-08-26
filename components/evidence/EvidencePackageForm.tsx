"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { EvidencePackageFormFields } from "@/components/evidence/EvidencePackageFormFields";
import type {
  Ce3CheckResponse,
  EvidencePackageFormProps,
  OrdersResponse,
} from "@/components/evidence/evidencePackageFormTypes";
import styles from './EvidencePackageOperations.module.css';

export type { EvidencePackageFormProps } from "@/components/evidence/evidencePackageFormTypes";

export function EvidencePackageForm({
  profileId,
  preselectedOrderId = "",
  caseContextId = "",
  syncOrderToUrl = false,
  showIntro = true,
  onCancel,
  onSuccess,
}: EvidencePackageFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const { data: ordersData, loading: loadingOrders, error: ordersError, reload: reloadOrders } =
    useFetchJson<OrdersResponse>(`/api/customers/${profileId}/orders`, {
      parse: async (response) => {
        if (!response.ok) throw new Error(`Order history could not be loaded (${response.status}).`);
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
        router.push(caseContextId ? `/cases?selected=${encodeURIComponent(caseContextId)}` : "/cases");
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

  function selectOrder(orderId: string) {
    setUserOrderId(orderId);
    if (!syncOrderToUrl) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('disputedOrder');
    if (orderId) next.set('orderId', orderId);
    else next.delete('orderId');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  return (
    <div data-builder-context={caseContextId || undefined} data-show-intro={showIntro || undefined}>
      {loadingOrders ? <div className={styles.loading} data-state-id="evidence-package-builder-loading" role="status" aria-busy="true"><strong>Loading order history</strong><span>Your customer and case context is preserved. Missing source facts will remain explicitly unavailable.</span></div> : null}
      {!loadingOrders && ordersError && !ordersData ? <div className={styles.empty} data-state-id="evidence-package-orders-unavailable" role="alert"><strong>Order history unavailable</strong><span>{ordersError} No empty customer history has been inferred.</span><div className={styles.stateActions}><button type="button" onClick={reloadOrders}>Try again</button><button type="button" onClick={() => router.push(`/customers/${profileId}`)}>Back to customer</button></div></div> : null}
      {!loadingOrders && !ordersError && orders.length === 0 ? <div className={styles.empty} data-state-id="evidence-package-no-orders"><strong>No orders found</strong><span>The connected records contain no orders for this customer. Evidence packages require at least one recorded order.</span><div className={styles.stateActions}><button type="button" onClick={() => router.push(`/customers/${profileId}`)}>Back to customer</button><button type="button" onClick={() => router.push('/sources/connected')}>Review connected sources</button></div></div> : null}
      {!loadingOrders && !ordersError && orders.length > 0 && !hasEligibleOrders ? <p className={styles.error} data-state-id="evidence-package-no-qualifying-cases">No refund claim or dispute is recorded. Only an order explicitly supplied by the route can remain selected; no case eligibility is inferred.</p> : null}

      {!loadingOrders && !ordersError && orders.length > 0 ? (
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
          onOrderChange={selectOrder}
          onNotesChange={setNotes}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </div>
  );
}
