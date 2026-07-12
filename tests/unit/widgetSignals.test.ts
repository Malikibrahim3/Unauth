import { widgetDataToSignals } from '@/lib/rules/widgetSignals';
import type { ClaimWidgetData } from '@/lib/gorgias/widgetData';
import { WITHHELD_EVIDENCE_SIGNALS } from '@/lib/gorgias/widgetData';

// ---------------------------------------------------------------------------
// JOB 2 — widgetSignals test rewrite
//
// The previous test checked fields (evidence_score, evidence_level,
// has_sufficient_data, is_network_flagged, confidence_grade, network_*) that
// were intentionally stripped from IdentitySignals as part of the branch
// refocus from cross-merchant network signals to merchant-local claim signals.
// lib/rules-engine.ts diff confirms the strip (see git diff HEAD).
// These tests now cover what widgetDataToSignals actually produces.
// ---------------------------------------------------------------------------

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
  it('maps merchant_claim_count from thisStore.claimCount', () => {
    const s = widgetDataToSignals(baseWidget(), NOW);
    expect(s.merchant_claim_count).toBe(1);
  });

  it('maps merchant_claim_count override correctly', () => {
    const s = widgetDataToSignals(
      baseWidget({ thisStore: { orderCount: 5, claimCount: 3, claimRate: 0.6, lastClaimAt: null, ordersCountSource: 'merchant_profile_totals' } }),
      NOW,
    );
    expect(s.merchant_claim_count).toBe(3);
  });

  it('calculates days_since_last_claim from thisStore.lastClaimAt', () => {
    // lastClaimAt = 2026-06-01, NOW = 2026-06-17 → 16 days
    const s = widgetDataToSignals(baseWidget(), NOW);
    expect(s.days_since_last_claim).toBe(16);
  });

  it('returns null for days_since_last_claim when lastClaimAt is null', () => {
    const s = widgetDataToSignals(
      baseWidget({ thisStore: { orderCount: 2, claimCount: 0, claimRate: 0, lastClaimAt: null, ordersCountSource: 'merchant_profile_totals' } }),
      NOW,
    );
    expect(s.days_since_last_claim).toBeNull();
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

  it('returns empty claim_types when none provided', () => {
    const s = widgetDataToSignals(baseWidget({ claimTypes: [] }), NOW);
    expect(s.claim_types).toEqual([]);
  });

  it('returns null for order_value_usd and account_age_days (not available in widget context)', () => {
    const s = widgetDataToSignals(baseWidget(), NOW);
    expect(s.order_value_usd).toBeNull();
    expect(s.account_age_days).toBeNull();
  });
});
