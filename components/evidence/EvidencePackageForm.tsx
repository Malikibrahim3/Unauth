"use client";

import { BILLABLE_EVENTS } from "@/lib/billing/plans";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { EvidencePackageFormFields } from "@/components/evidence/EvidencePackageFormFields";
import type {
  Ce3CheckResponse,
  EvidencePackageFormProps,
  OrdersResponse,
} from "@/components/evidence/evidencePackageFormTypes";
const emptyStateStyle = { display: 'grid', gap: 7, minHeight: 150, alignContent: 'center', padding: 24, border: '1px solid #e4e3e0', borderRadius: 12, background: '#ffffff', color: '#40454a' } as const;
const stateActionsStyle = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 5 } as const;

export type { EvidencePackageFormProps } from "@/components/evidence/evidencePackageFormTypes";

export function EvidencePackageForm({
  profileId,
  preselectedOrderId = "",
  caseContextId = "",
  syncOrderToUrl = false,
  showIntro = true,
  onCancel,
  onSuccess,
  acceptanceState,
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
    useFetchJson<OrdersResponse>(acceptanceState ? null : `/api/customers/${profileId}/orders`, {
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
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const packageIncludes = [
    {
      label: "Prior matching transactions (if any)",
      available: priorMatchPreview === "likely",
      pending: priorMatchPreview === "unknown",
      source: 'Retained customer records',
      freshness: priorMatchChecking ? 'checking now' : 'checked for this order',
      packEffect: priorMatchPreview === 'likely' ? 'Included as a supported prior match' : 'Left out; no match is inferred',
      repairHref: `/customers/${profileId}`,
    },
    { label: "Customer identity record", available: true, source: 'Customer registry', freshness: 'current route subject', packEffect: 'Anchors the package to this customer', repairHref: `/customers/${profileId}` },
    { label: "Selected order record", available: Boolean(selectedOrder), source: selectedOrder?.source_name ?? selectedOrder?.source ?? 'Connected commerce source', freshness: selectedOrder?.source_updated_at ?? selectedOrder?.processed_at ?? 'unavailable', packEffect: selectedOrder ? 'Anchors the package to one immutable order' : 'Blocks package construction', repairHref: '/sources/connected' },
    { label: "Identity signals observed", available: priorMatchPreview !== 'unknown', pending: priorMatchPreview === 'unknown', source: 'Retained customer records', freshness: priorMatchChecking ? 'checking now' : 'current retained read', packEffect: priorMatchPreview === 'unknown' ? 'Left out while source result is unavailable' : 'Includes only observed source results', repairHref: `/customers/${profileId}?tab=identity` },
    {
      label: "Merchant notes",
      available: !!notes.trim(),
      optional: true,
      source: 'Merchant entry',
      freshness: notes.trim() ? 'current unsaved entry' : 'not entered',
      packEffect: notes.trim() ? 'Included as merchant-authored context' : 'Optional and not included',
    },
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

  if (acceptanceState) {
    return (
      <div data-state-id="evidence-package-no-orders-no-cases-states">
        {acceptanceState === 'no-orders' ? (
          <div style={emptyStateStyle} data-state-id="evidence-package-no-orders">
            <strong>No orders found</strong>
            <span>The connected records contain no orders for this customer. Evidence packages require at least one recorded order.</span>
          </div>
        ) : (
          <div style={emptyStateStyle} data-state-id="evidence-package-no-qualifying-cases">
            <strong>No qualifying cases found</strong>
            <span>No refund claim or dispute is recorded. Case eligibility is not inferred from an order alone.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-builder-context={caseContextId || undefined} data-show-intro={showIntro || undefined} style={{ width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <p data-credit-preview="evidence.summary" style={{ margin: 0, color: "#64686d", fontSize: 12 }}>{BILLABLE_EVENTS["evidence.summary"].label}: {BILLABLE_EVENTS["evidence.summary"].credits} credits. {BILLABLE_EVENTS["evidence.summary"].chargingRule} Each newly generated report is a separate operation.</p>
      {loadingOrders ? <div style={emptyStateStyle} data-state-id="evidence-package-builder-loading" role="status" aria-busy="true"><strong>Loading order history</strong><span>Your customer and case context is preserved. Missing source facts will remain explicitly unavailable.</span></div> : null}
      {!loadingOrders && ordersError && !ordersData ? <div style={emptyStateStyle} data-state-id="evidence-package-orders-unavailable" role="alert"><strong>Order history unavailable</strong><span>{ordersError} No empty customer history has been inferred.</span><div style={stateActionsStyle}><button type="button" onClick={reloadOrders}>Try again</button><button type="button" onClick={() => router.push(`/customers/${profileId}`)}>Back to customer</button></div></div> : null}
      {!loadingOrders && !ordersError && orders.length === 0 ? <div style={emptyStateStyle} data-state-id="evidence-package-no-orders"><strong>No orders found</strong><span>The connected records contain no orders for this customer. Evidence packages require at least one recorded order.</span><div style={stateActionsStyle}><button type="button" onClick={() => router.push(`/customers/${profileId}`)}>Back to customer</button><button type="button" onClick={() => router.push('/sources/connected')}>Review connected sources</button></div></div> : null}
      {!loadingOrders && !ordersError && orders.length > 0 && !hasEligibleOrders ? <p style={{ margin: 0, padding: '10px 12px', borderRadius: 9, background: '#fdf0e6', color: '#b0431a', fontSize: 12 }} data-state-id="evidence-package-no-qualifying-cases">No refund claim or dispute is recorded. Only an order explicitly supplied by the route can remain selected; no case eligibility is inferred.</p> : null}

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
