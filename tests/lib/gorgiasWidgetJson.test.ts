import { gorgiasWidgetModelToJson } from '@/lib/gorgias/widgetJson';

const FULL_STATS = {
  storeOrders: 3,
  storeClaims: 2,
  primaryReason: '"Item not received" · 75%',
  storeRecentClaims: 1,
  networkOrders: 12,
  networkClaims: 9,
  networkMerchants: 4,
  networkRecentClaims: 3,
};

describe('gorgiasWidgetModelToJson', () => {
  it('formats merchant_profile with full stats into comparison rows', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'merchant_profile',
      profileId: 'profile-1',
      riskLevel: 'high',
      riskScore: 82,
      fraudFlags: ['shared_device'],
      identityConfidenceGrade: 'definite',
      profileUrl: null,
      stats: FULL_STATS,
    });

    expect(payload.orders).toBe('3 orders here · 12 across 4 stores');
    expect(payload.claim_rate).toBe('67% this store · 75% network');
    expect(payload.primary_reason).toBe('"Item not received" · 75%');
    expect(payload.recent_activity).toBe('1 claim in last 90 days');
    for (const value of Object.values(payload)) {
      expect(typeof value).toBe('string');
      expect(value).not.toBe('');
    }
  });

  it('merchant_profile with null stats falls back to dashes', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'merchant_profile',
      profileId: 'profile-1',
      riskLevel: 'medium',
      riskScore: 28,
      fraudFlags: [],
      identityConfidenceGrade: null,
      profileUrl: null,
      stats: null,
    });

    expect(payload).toEqual({
      orders: '—',
      claim_rate: '—',
      primary_reason: '—',
      recent_activity: '—',
    });
  });

  it('merchant_profile with no claims shows dashes for reason and recent', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'merchant_profile',
      profileId: 'p',
      riskLevel: 'low',
      riskScore: 10,
      fraudFlags: [],
      identityConfidenceGrade: null,
      profileUrl: null,
      stats: { ...FULL_STATS, storeClaims: 0, primaryReason: null, storeRecentClaims: 0 },
    });

    expect(payload.claim_rate).toBe('0% this store · 75% network');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });

  it('never returns null fields for not_found', () => {
    const payload = gorgiasWidgetModelToJson({ state: 'not_found' });
    expect(payload.orders).toBe('Not seen at any store yet');
    expect(Object.values(payload).every((v) => typeof v === 'string')).toBe(true);
  });

  it('risk state with cross_merchant shows network context in orders row', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'risk',
      tier: 'high',
      lookup: {
        risk_grade: 'A',
        confidence: 'definite',
        risk_score: 82,
        signals: ['shared_device'],
        cross_merchant: { merchant_count: 4, claim_count: 9 },
      },
      merchantProfile: null,
      showEvidence: true,
      profileUrl: null,
    });

    expect(payload.orders).toContain('4 stores');
    expect(payload.orders).toContain('9 claims');
    expect(payload.claim_rate).toBe('—');
  });
});
