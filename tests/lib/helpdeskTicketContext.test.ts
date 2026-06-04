import {
  serializeHelpdeskTicketContext,
  type HelpdeskTicketContextBody,
} from '@/lib/api/v1/helpdeskTicketContext';
import type { GorgiasWidgetModel } from '@/lib/gorgias/widgetData';

describe('serializeHelpdeskTicketContext', () => {
  it('maps merchant_profile stats to store and network blocks', () => {
    const model: GorgiasWidgetModel = {
      state: 'merchant_profile',
      profileId: 'profile-1',
      confidenceGrade: 'definite',
      profileUrl: 'https://app.example/customers/profile-1',
      stats: {
        storeOrders: 12,
        storeClaims: 2,
        primaryReason: '"refund" · 80%',
        storeRecentClaims: 1,
        networkOrders: 40,
        networkClaims: 5,
        networkMerchants: 4,
        networkRecentClaims: 2,
      },
    };

    const body = serializeHelpdeskTicketContext(model);
    expect(body.state).toBe('merchant_profile');
    expect(body.store).toEqual({
      orders: 12,
      claims: 2,
      primary_reason: '"refund" · 80%',
      recent_claims_90d: 1,
    });
    expect(body.network).toEqual({
      orders: 40,
      claims: 5,
      merchants: 4,
      recent_claims_90d: 2,
    });
    expect(body.profile_url).toBe('https://app.example/customers/profile-1');
  });

  it('returns not_found shape', () => {
    const body = serializeHelpdeskTicketContext({ state: 'not_found' });
    expect(body.state).toBe('not_found');
    expect(body.store).toBeNull();
  });

  it('preserves error message', () => {
    const body = serializeHelpdeskTicketContext({
      state: 'error',
      message: 'Rate limited',
    });
    expect(body.state).toBe('error');
    expect(body.message).toBe('Rate limited');
  });
});

describe('HelpdeskTicketContextBody', () => {
  it('is assignable for API responses', () => {
    const sample: HelpdeskTicketContextBody = {
      state: 'low_clear',
      profile_url: null,
      confidence: 'definite',
      matched_on: [],
      store: { orders: 3, claims: 0, primary_reason: null, recent_claims_90d: 0 },
      network: null,
      claims_record: null,
      ce3_evidence_available: false,
      message: null,
    };
    expect(sample.store?.orders).toBe(3);
  });
});
