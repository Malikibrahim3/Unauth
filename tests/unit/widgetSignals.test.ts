import { widgetDataToSignals } from '@/lib/rules/widgetSignals';
import type { ClaimWidgetData } from '@/lib/gorgias/widgetData';
import { WITHHELD_EVIDENCE_SIGNALS } from '@/lib/gorgias/widgetData';

const NOW = Date.parse('2026-06-17T00:00:00.000Z');

function baseWidget(overrides: Partial<ClaimWidgetData> = {}): ClaimWidgetData {
  return {
    confidenceGrade: 'probable',
    matchedOn: ['email address'],
    ce3EvidenceAvailable: true,
    thisStore: {
      orderCount: 2,
      claimCount: 1,
      claimRate: 0.5,
      lastClaimAt: '2026-06-01T00:00:00.000Z',
      ordersCountSource: 'merchant_profile_totals',
    },
    network: {
      merchantCount: 4,
      orderCount: 10,
      claimCount: 5,
      claimRate: 0.5,
      lastClaimAt: '2026-06-10T00:00:00.000Z',
      primaryReason: null,
      recentClaimCount: 0,
      recentWindowDays: 90,
    },
    storeClaimValue: null,
    storePrimaryReason: null,
    storeRecentClaimCount: 0,
    profileUrl: 'https://app.unauth.test/customers',
    dataFreshAt: '2026-06-17T00:00:00.000Z',
    watchlisted: false,
    ...WITHHELD_EVIDENCE_SIGNALS,
    ...overrides,
  };
}

describe('widgetDataToSignals', () => {
  it('maps real evidence values when disclosure is allowed', () => {
    const s = widgetDataToSignals(
      baseWidget({
        evidenceDisclosed: true,
        evidenceScore: 62,
        evidenceLevel: 'substantial',
        hasSufficientData: true,
      }),
      NOW,
    );
    expect(s.evidence_score).toBe(62);
    expect(s.evidence_level).toBe('substantial');
    expect(s.has_sufficient_data).toBe(true);
  });

  it('uses safe neutral evidence values when disclosure is withheld', () => {
    const s = widgetDataToSignals(
      baseWidget({
        evidenceDisclosed: false,
        evidenceScore: 99,
        evidenceLevel: 'extensive',
        hasSufficientData: true,
        network: null,
      }),
      NOW,
    );
    expect(s.evidence_score).toBe(0);
    expect(s.evidence_level).toBe('minimal');
    expect(s.has_sufficient_data).toBe(false);
  });

  it('maps canonical claim_types from widget data', () => {
    const s = widgetDataToSignals(
      baseWidget({ claimTypes: ['chargeback', 'item_not_received'] }),
      NOW,
    );
    expect(s.claim_types).toEqual(['chargeback', 'item_not_received']);
    expect(s.claim_types).not.toContain('INR');
    expect(s.claim_types).not.toContain('refund');
  });

  it('maps is_network_flagged from widget data', () => {
    expect(widgetDataToSignals(baseWidget({ isNetworkFlagged: true }), NOW).is_network_flagged).toBe(true);
    expect(widgetDataToSignals(baseWidget({ isNetworkFlagged: false }), NOW).is_network_flagged).toBe(false);
  });
});
