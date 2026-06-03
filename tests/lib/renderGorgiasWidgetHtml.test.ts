import { assembleClaimWidgetData, type WidgetStats } from '@/lib/gorgias/widgetData';
import { renderGorgiasWidgetHtml } from '@/lib/gorgias/renderWidgetHtml';

const NOW = '2026-01-01T00:00:00.000Z';

const emptyStoreClaimFields = {
  storePrimaryReason: null,
  storeRecentClaimCount: 0,
} as const;

function merchantProfileModel(stats: WidgetStats) {
  return {
    state: 'merchant_profile' as const,
    profileId: 'profile-1',
    riskLevel: 'high' as const,
    riskScore: 82,
    fraudFlags: ['shared_device'],
    identityConfidenceGrade: 'definite' as const,
    profileUrl: 'https://app.unauth.test/customers/p1',
    stats,
  };
}

function richStats(): WidgetStats {
  return {
    storeOrders: 9,
    storeClaims: 4,
    primaryReason: '"Item not received" · 80%',
    storeRecentClaims: 2,
    networkOrders: 20,
    networkClaims: 8,
    networkMerchants: 3,
    networkRecentClaims: 2,
  };
}

describe('renderGorgiasWidgetHtml', () => {
  it('does not leak case stats without ticket scope (production-safe preview)', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel(richStats()),
      summary: {
        total_orders: 9,
        total_claims: 4,
        claim_rate: 0.44,
        last_claim_at: NOW,
        updated_at: NOW,
      },
      primaryReason: { type: 'dominant', label: 'Item not received', percentage: 100 },
      profileUrl: 'https://app.unauth.test/customers/p1',
      nowIso: NOW,
      ...emptyStoreClaimFields,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const html = renderGorgiasWidgetHtml({
      result,
      profileUrl: result.data.profileUrl,
      link: { widgetToken: 'wt', email: 'a@b.com', ticketRef: null, orderRef: null },
    });

    expect(html).toContain('Unauth claim context');
    expect(html).toContain('Basic context');
    expect(html).not.toMatch(/\b9\b.*orders/i);
    expect(html).not.toContain('DEFINITE');
    expect(html).not.toContain('Item not received');
    expect(html).not.toContain('CE 3.0 evidence available');
    expect(html).not.toContain('75% network');
  });

  it('allows detailed diagnostic HTML only with allowDetailedPreview in non-production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const result = assembleClaimWidgetData({
        model: merchantProfileModel(richStats()),
        summary: {
          total_orders: 9,
          total_claims: 4,
          claim_rate: 0.44,
          last_claim_at: NOW,
          updated_at: NOW,
        },
        primaryReason: null,
        profileUrl: null,
        nowIso: NOW,
        ...emptyStoreClaimFields,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const html = renderGorgiasWidgetHtml({
        result,
        profileUrl: null,
        options: { allowDetailedPreview: true },
      });
      expect(html).toContain('9 orders');
      expect(html).toContain('claim rate');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
