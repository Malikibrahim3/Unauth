import {
  E2E_MERCHANT_ID,
  isE2eTestAuthEnabled,
  validateE2eAuthRequest,
  validateE2eMerchantId,
} from '@/lib/e2e/testAuth';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';

describe('E2E test auth guard', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('is disabled on production deploys', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.E2E_AUTH_SECRET = 'local-only-secret-1234';
    expect(isE2eTestAuthEnabled()).toBe(false);
  });

  it('requires secret outside production', () => {
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_AUTH_SECRET;
    expect(isE2eTestAuthEnabled()).toBe(false);

    process.env.E2E_AUTH_SECRET = 'local-only-secret-1234';
    expect(isE2eTestAuthEnabled()).toBe(true);
  });

  it('only allows the canonical E2E merchant', () => {
    expect(validateE2eMerchantId(E2E_MERCHANT_ID)).toBe(true);
    expect(validateE2eMerchantId('00000000-0000-4000-8000-000000000099')).toBe(false);
  });

  it('validates secret + merchant together', () => {
    process.env.E2E_AUTH_SECRET = 'local-only-secret-1234';
    expect(
      validateE2eAuthRequest({
        secret: 'local-only-secret-1234',
        merchantId: E2E_MERCHANT_ID,
      }),
    ).toBe(true);
    expect(
      validateE2eAuthRequest({
        secret: 'wrong',
        merchantId: E2E_MERCHANT_ID,
      }),
    ).toBe(false);
  });
});

function makeShopifyGorgiasContext(): ClaimDecisionContext {
  return {
    merchantId: E2E_MERCHANT_ID,
    claim: {
      id: '361dd765-8451-428d-9562-d490b1e13c68',
      type: 'item_not_received',
      status: 'open',
      reason: 'missing_parcel',
      requestedAction: 'reship',
      amountAtRisk: 185,
      currency: 'USD',
    },
    order: {
      id: 'order-1013',
      orderNumber: '1013',
      email: 'simsorsno3@icloud.com',
      totalPrice: 185,
      currency: 'USD',
    },
    ticket: {
      id: 'ticket-db',
      externalId: '67818375',
      subject: 'E2E refund request for order #1013 - item not received',
      status: 'open',
    },
    evidence: {
      hasCustomerEvidence: true,
      merchantEvidenceItems: 0,
      items: [],
    },
    delivery: null,
    customer: {
      email: 'simsorsno3@icloud.com',
      displayName: 'simon murphy',
    },
    integrations: {
      trackingConnected: false,
      returnsConnected: false,
      wmsConnected: false,
    },
  } as ClaimDecisionContext;
}

describe('Shopify + Gorgias evidence checklist', () => {
  it('marks order/ticket evidence present and tracking gaps missing', () => {
    const checklist = buildEvidenceChecklist(makeShopifyGorgiasContext(), 'item_not_received');
    const byKey = Object.fromEntries(checklist.items.map((item) => [item.key, item.state]));

    expect(byKey.customer_statement).toBe('present');
    expect(byKey.tracking).toBe('missing');
    expect(byKey.proof_of_delivery).toBe('missing');
    expect(byKey.delivery_scan_timeline).toBe('missing');
    expect(byKey.delivery_photo).toBe('not_tracked');
    expect(byKey.signature).toBe('not_tracked');
    expect(checklist.strength).not.toBe('strong');
  });

  it('does not fabricate carrier proof when delivery is absent', () => {
    const checklist = buildEvidenceChecklist(makeShopifyGorgiasContext(), 'item_not_received');
    const carrierItems = checklist.items.filter((item) =>
      ['proof_of_delivery', 'delivery_scan_timeline', 'carrier_identified'].includes(item.key),
    );
    expect(carrierItems.every((item) => item.state !== 'present')).toBe(true);
  });
});
