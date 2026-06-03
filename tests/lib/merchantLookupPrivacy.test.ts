import { can, TIER_CONFIG } from '@/lib/billing/tiers';
import { CONTEXT_CREDIT_COSTS } from '@/lib/billing/contextCredits';

describe('merchant lookup privacy and plan gates', () => {
  it('does not hard-gate pseudonymous network context to Growth only', () => {
    expect(can('free', 'network_signal_enrichment')).toBe(true);
    expect(can('pro', 'network_signal_enrichment')).toBe(true);
    expect(can('growth', 'network_signal_enrichment')).toBe(true);
  });

  it('keeps API lookup on Scale while store/network context uses credits on all plans', () => {
    expect(TIER_CONFIG.free.features.lookup_api).toBeUndefined();
    expect(TIER_CONFIG.pro.features.lookup_api).toBeUndefined();
    expect(TIER_CONFIG.growth.features.lookup_api).toBeUndefined();
    expect(TIER_CONFIG.scale.features.lookup_api).toBe(true);
    expect(can('free', 'network_signal_enrichment')).toBe(true);
  });

  it('uses settled credit costs for context unlock types', () => {
    expect(CONTEXT_CREDIT_COSTS.basic_context).toBe(1);
    expect(CONTEXT_CREDIT_COSTS.full_context).toBe(2);
    expect(CONTEXT_CREDIT_COSTS.evidence_summary).toBe(3);
  });
});
