import { evaluateMissingLossCaseEvidence } from '@/lib/losses/evidenceRequirements';
import type { ProviderConnectionView } from '@/lib/integrations/types';

function provider(overrides: Partial<ProviderConnectionView>): ProviderConnectionView {
  return {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    authMode: 'oauth',
    buildStatus: 'live',
    evidenceCapabilities: [],
    capabilities: {},
    status: 'not_connected',
    lastSyncAt: null,
    lastError: null,
    detail: null,
    ...overrides,
  };
}

describe('evaluateMissingLossCaseEvidence', () => {
  it('calculates required and recommended missing evidence for chargebacks', () => {
    const missing = evaluateMissingLossCaseEvidence({
      caseCategory: 'chargeback_or_payment_dispute',
      presentEvidenceTypes: ['order_details', 'payment_record'],
      providerViews: [
        provider({
          id: 'shopify',
          name: 'Shopify',
          status: 'connected',
          evidenceCapabilities: ['order_value', 'refund_history', 'dispute_status'],
        }),
        provider({
          id: 'gorgias',
          name: 'Gorgias',
          category: 'helpdesk',
          status: 'connected',
          evidenceCapabilities: ['ticket_messages', 'customer_claim_reason'],
        }),
      ],
    });

    expect(missing.map((item) => item.evidenceType)).toEqual(
      expect.arrayContaining(['dispute_reason', 'customer_correspondence', 'refund_record']),
    );
    expect(missing.find((item) => item.evidenceType === 'refund_record')).toMatchObject({
      requirementLevel: 'required',
      currentlyCollectibleAutomatically: true,
      unavailableBecause: null,
    });
  });

  it('keeps unconnected slot-only providers unavailable instead of collectible', () => {
    const missing = evaluateMissingLossCaseEvidence({
      caseCategory: 'chargeback_or_payment_dispute',
      presentEvidenceTypes: [
        'order_details',
        'payment_record',
        'dispute_reason',
        'customer_correspondence',
        'refund_record',
        'tracking_timeline',
        'delivery_confirmation',
        'terms_or_policy_snapshot',
        'processor_case_update',
      ],
      providerViews: [
        provider({
          id: 'loop',
          name: 'Loop',
          category: 'returns',
          buildStatus: 'slot_only',
          evidenceCapabilities: ['return_request_status', 'return_inspection_outcome'],
        }),
      ],
    });

    expect(missing.find((item) => item.evidenceType === 'return_status')).toMatchObject({
      currentlyCollectibleAutomatically: false,
      unavailableBecause: 'unsupported_provider_capability',
      blockedWithoutIt: false,
    });
  });

  it('blocks clarification when automation is disabled for that evidence type', () => {
    const missing = evaluateMissingLossCaseEvidence({
      caseCategory: 'delivery_loss',
      presentEvidenceTypes: ['order_details', 'proof_of_value', 'tracking_timeline', 'customer_claim_message'],
      automationDisabledEvidenceTypes: ['carrier_lost_confirmation'],
      providerViews: [
        provider({
          id: 'carrier_claims',
          name: 'Carrier Claims API',
          category: 'carrier',
          status: 'connected',
          evidenceCapabilities: ['delivery_photo', 'signature'],
        }),
      ],
    });

    expect(missing.find((item) => item.evidenceType === 'carrier_lost_confirmation')).toMatchObject({
      currentlyCollectibleAutomatically: false,
      clarificationShouldBeRequested: false,
      unavailableBecause: 'automation_setting_disabled',
    });
  });
});
