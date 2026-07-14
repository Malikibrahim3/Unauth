/**
 * lib/claim-gate/evidenceState.ts
 *
 * Evidence state evaluator — the backbone of honest reasoning.
 *
 * For every claim, each evidence dimension is classified into exactly one of:
 *
 *   - `present`     — the data exists and has a value
 *   - `missing`     — the source IS connected but returned no data for this
 *                     (e.g. carrier connected, but no proof-of-delivery photo)
 *   - `unavailable` — the source is NOT connected for this merchant, so the
 *                     dimension is unknowable (e.g. no fulfilment integration)
 *
 * This distinction is what keeps the gate honest. "POD missing" supports a
 * hold; "warehouse data unavailable" means the engine cannot speak to warehouse
 * fault at all and must say so in its limitations.
 *
 * Pure function: no IO. Given the same evidence it always returns the same map.
 */
import type { ClaimGateConnections, ClaimGateEvidence } from '@/lib/claim-gate/types';

export type EvidenceDimension = 'present' | 'missing' | 'unavailable';

export type ClaimEvidenceState = {
  // Delivery (direct UPS/FedEx carrier tracking)
  delivery_status: EvidenceDimension; // did the carrier report a status?
  delivery_scan: EvidenceDimension; // is there a delivered scan?
  proof_of_delivery: EvidenceDimension; // POD photo/signature present?
  carrier_claim_window: EvidenceDimension; // could the window be calculated?

  // Order & customer (Shopify / merchant-local data)
  order_value: EvidenceDimension;
  customer_claim_history: EvidenceDimension; // do we have prior-claim data?

  // Warehouse (ShipBob)
  warehouse_fulfillment: EvidenceDimension; // present only if ShipBob connected + returned
  sku_verification: EvidenceDimension; // could we compare ordered vs shipped SKUs?

  // Support
  support_ticket: EvidenceDimension; // is there a linked ticket with content?
};

function hasShipmentContext(evidence: ClaimGateEvidence): boolean {
  return evidence.shipment != null || evidence.fulfillmentEvidence.length > 0;
}

function deliveryStatusState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (evidence.summary.delivery_status !== 'UNKNOWN') return 'present';
  // A status could not be derived. If we have any tracking source attached we
  // treat it as connected-but-empty (missing); otherwise it is unknowable.
  if (connections.carrier_tracking || hasShipmentContext(evidence)) return 'missing';
  return 'unavailable';
}

function deliveryScanState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  const scanned =
    evidence.summary.delivery_status === 'DELIVERED' ||
    evidence.fulfillmentEvidence.some((item) => item.delivery_scan_present);
  if (scanned) return 'present';
  if (connections.carrier_tracking || hasShipmentContext(evidence)) return 'missing';
  return 'unavailable';
}

function proofOfDeliveryState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (evidence.summary.proof_of_delivery === 'PRESENT') return 'present';
  // POD photos/signatures are surfaced only by the carrier tracking integration.
  if (!connections.carrier_tracking) return 'unavailable';
  return 'missing';
}

function carrierClaimWindowState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (evidence.summary.carrier_claim_window !== 'UNKNOWN') return 'present';
  if (!connections.carrier_tracking && !hasShipmentContext(evidence)) return 'unavailable';
  return 'missing';
}

function orderValueState(evidence: ClaimGateEvidence): EvidenceDimension {
  if (evidence.moneyAtRisk > 0) return 'present';
  // The order resolved (the gate requires it) but carried no value.
  return evidence.order ? 'missing' : 'unavailable';
}

function warehouseFulfillmentState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (!connections.warehouse) return 'unavailable';
  return evidence.shipbobEvidence?.order_found ? 'present' : 'missing';
}

function skuVerificationState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (!connections.warehouse) return 'unavailable';
  const shipbob = evidence.shipbobEvidence;
  if (!shipbob?.order_found) return 'missing';
  // We can compare ordered vs shipped only if the warehouse returned line-level
  // pick/pack or return detail.
  const hasLineDetail = shipbob.pick_pack_events > 0 || (shipbob.return_items?.length ?? 0) > 0;
  return hasLineDetail ? 'present' : 'missing';
}

function supportTicketState(evidence: ClaimGateEvidence, connections: ClaimGateConnections): EvidenceDimension {
  if (evidence.ticket != null) return 'present';
  return connections.helpdesk ? 'missing' : 'unavailable';
}

/**
 * Classify each evidence dimension as present / missing / unavailable.
 *
 * `unavailable` is driven by whether the relevant integration is connected
 * (see `evidence.connections`), never by the absence of a value alone.
 */
export function evaluateEvidenceState(evidence: ClaimGateEvidence): ClaimEvidenceState {
  const connections = evidence.connections;
  return {
    delivery_status: deliveryStatusState(evidence, connections),
    delivery_scan: deliveryScanState(evidence, connections),
    proof_of_delivery: proofOfDeliveryState(evidence, connections),
    carrier_claim_window: carrierClaimWindowState(evidence, connections),
    order_value: orderValueState(evidence),
    // The merchant's own claim history is always computable from local data.
    customer_claim_history: 'present',
    warehouse_fulfillment: warehouseFulfillmentState(evidence, connections),
    sku_verification: skuVerificationState(evidence, connections),
    support_ticket: supportTicketState(evidence, connections),
  };
}
