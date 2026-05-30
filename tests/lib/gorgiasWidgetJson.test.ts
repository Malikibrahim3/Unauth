import { gorgiasWidgetModelToJson } from '@/lib/gorgias/widgetJson';

describe('gorgiasWidgetModelToJson', () => {
  it('returns flat string fields matching Gorgias template paths', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'risk',
      tier: 'high',
      lookup: {
        risk_grade: 'A',
        confidence: 'definite',
        risk_score: 82,
        signals: ['shared_device'],
        cross_merchant: { merchant_count: 2, claim_count: 1 },
      },
      merchantProfile: null,
      showEvidence: true,
      profileUrl: null,
    });

    expect(payload).toEqual({
      risk_level: 'HIGH RISK',
      risk_score: '82',
      cross_merchant: '2 merchants · 1 claim',
      fraud_flags: 'shared_device',
    });
    for (const value of Object.values(payload)) {
      expect(typeof value).toBe('string');
      expect(value).not.toBe('');
    }
  });

  it('maps merchant_profile to flat string JSON for Gorgias template', () => {
    const payload = gorgiasWidgetModelToJson({
      state: 'merchant_profile',
      profileId: 'profile-1',
      riskLevel: 'medium',
      riskScore: 28.30909090908227,
      fraudFlags: ['velocity', 'paymentChurn'],
      identityConfidenceGrade: null,
      profileUrl: null,
    });

    expect(payload).toEqual({
      risk_level: 'MEDIUM',
      risk_score: '28',
      cross_merchant: 'Not available',
      fraud_flags: 'velocity, paymentChurn',
    });
  });

  it('never returns null fields for not_found', () => {
    const payload = gorgiasWidgetModelToJson({ state: 'not_found' });
    expect(payload.risk_score).toBe('0');
    expect(Object.values(payload).every((v) => typeof v === 'string')).toBe(true);
  });
});
