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
          evidenceCapabilities: ['order_details', 'payment_record', 'refund_record'],
        }),
        provider({
          id: 'gorgias',
          name: 'Gorgias',
          category: 'helpdesk',
          status: 'connected',
          evidenceCapabilities: ['customer_correspondence'],
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
      caseCategory: 'supplier_or_vendor_issue',
      presentEvidenceTypes: ['purchase_order'],
      providerViews: [
        provider({
          id: 'netsuite',
          name: 'NetSuite',
          category: 'erp',
          buildStatus: 'slot_only',
          evidenceCapabilities: ['supplier_invoice', 'vendor_credit_note'],
        }),
      ],
    });

    expect(missing.find((item) => item.evidenceType === 'supplier_invoice')).toMatchObject({
      currentlyCollectibleAutomatically: false,
      unavailableBecause: 'unsupported_provider_capability',
      blockedWithoutIt: true,
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
          evidenceCapabilities: ['carrier_lost_confirmation'],
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
