import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type { Partner } from '@/lib/partners/types';
import type { SupportPayoutCase } from '@/lib/payouts/types';
import type {
  InvestigationRecommendation,
  InvestigationTarget,
} from '@/lib/investigations/types';

function partnerTypeForTarget(target: InvestigationTarget): Partner['partner_type'] {
  switch (target) {
    case '3pl':
      return 'three_pl';
    case 'internal':
      return 'internal_team';
    case 'customer':
      return 'other';
    case 'carrier':
    case 'warehouse':
    case 'supplier':
      return target;
  }
}

function chooseTarget(
  context: ClaimDecisionContext,
  payoutCase: SupportPayoutCase,
): {
  target: InvestigationTarget;
  gap: string;
  reason: string;
  requested: string[];
  secondary: boolean;
} {
  const delivery = context.delivery;
  switch (payoutCase.claimType) {
    case 'missing_item':
      return {
        target: '3pl',
        gap: 'Did the parcel pass final pick, pack, quantity, and weight checks with every ordered item inside?',
        reason: 'The parcel was delivered, but a partial-order shortfall is best answered by the fulfilment record first.',
        requested: ['pick_pack_record', 'final_parcel_weight', 'pack_image', 'warehouse_exception_log'],
        secondary: false,
      };
    case 'item_not_received':
      if (delivery?.deliveryPhotoFinding === 'inconsistent') {
        return {
          target: 'carrier',
          gap: 'Why does the delivery photo appear inconsistent with the intended delivery address, and where was the parcel actually left?',
          reason: 'A merchant reviewer found the delivery photo inconsistent, so the carrier holds the next material location and driver evidence.',
          requested: ['driver_location_record', 'delivery_coordinates', 'full_delivery_photo', 'driver_statement', 'carrier_investigation_finding'],
          secondary: false,
        };
      }
      if (delivery?.hasTracking || delivery?.status === 'in_transit' || delivery?.status === 'delivered') {
        return {
          target: 'carrier',
          gap: delivery.hasProofOfDelivery
            ? 'Do the delivery artefacts and location records support delivery to the intended address?'
            : 'What is the carrier finding for the parcel after handover, including the final delivery or exception record?',
          reason: 'The available record shows carrier custody or a carrier delivery event, so the carrier holds the next material fact.',
          requested: ['tracking_event_timeline', 'delivery_photo', 'signature', 'delivery_location', 'carrier_investigation_finding'],
          secondary: false,
        };
      }
      return {
        target: '3pl',
        gap: 'Was the completed parcel handed to the carrier, and what record proves that handover?',
        reason: 'Carrier custody is not yet established, so fulfilment handover evidence is the first unanswered question.',
        requested: ['dispatch_record', 'carrier_handover_scan', 'manifest', 'final_parcel_weight'],
        secondary: false,
      };
    case 'wrong_item':
      return {
        target: '3pl',
        gap: 'Which SKU and quantity were scanned and packed for this order?',
        reason: 'A wrong-item report is normally resolved first by the warehouse pick and pack record.',
        requested: ['pick_scan', 'pack_record', 'pack_image', 'inventory_adjustment'],
        secondary: false,
      };
    case 'damaged':
      return {
        target: delivery?.status === 'delivered' ? 'carrier' : '3pl',
        gap: delivery?.status === 'delivered'
          ? 'Was damage or an exception recorded while the parcel was in carrier custody?'
          : 'What was the item and outer packaging condition when the parcel left fulfilment?',
        reason: delivery?.status === 'delivered'
          ? 'A delivered shipment with damage needs the carrier exception and handling record.'
          : 'The pre-handover packing condition must be established before attributing transit damage.',
        requested: delivery?.status === 'delivered'
          ? ['carrier_exception_log', 'damage_record', 'delivery_photo']
          : ['pack_image', 'packaging_specification', 'warehouse_exception_log'],
        secondary: true,
      };
    default:
      return {
        target: 'internal',
        gap: 'Which material fact is still required before the customer decision can be recorded?',
        reason: 'The current issue does not map safely to one external party without merchant review.',
        requested: payoutCase.evidence.items
          .filter((item) => item.state !== 'present')
          .map((item) => item.key)
          .slice(0, 6),
        secondary: false,
      };
  }
}

export function recommendInvestigation(input: {
  context: ClaimDecisionContext;
  payoutCase: SupportPayoutCase;
  partners?: Partner[];
  responseSlaHours?: number;
  now?: Date;
}): InvestigationRecommendation {
  const route = chooseTarget(input.context, input.payoutCase);
  const partnerType = partnerTypeForTarget(route.target);
  const partner = (input.partners ?? []).find(
    (candidate) => candidate.status === 'active' && candidate.partner_type === partnerType,
  );
  const slaHours = partner?.response_sla_hours
    ?? input.responseSlaHours
    ?? 48;
  const now = input.now ?? new Date();
  return {
    targetType: route.target,
    targetName: partner?.name ?? null,
    partnerId: partner?.id ?? null,
    evidenceGap: route.gap,
    reason: route.reason,
    requestedEvidence: route.requested,
    priority: input.payoutCase.exposure.aboveReviewThreshold ? 'urgent' : 'high',
    dueAt: new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString(),
    secondaryJustified: route.secondary,
  };
}
