import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BILLABLE_EVENTS,
  parseRequestedPlanId,
  PLANS,
  PUBLIC_PLAN_IDS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
} from '@/lib/billing/plans';
import { CONTEXT_BILLABLE_EVENT, CONTEXT_CREDIT_COSTS } from '@/lib/billing/contextCredits';
import { LANDING_PRICING_TIERS } from '@/lib/billing/landingTierChart';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import { projectProviderCapabilityStatus } from '@/lib/integrations/capabilityStatus';
import { deriveProviderDisplayStage, getIntegrationProvider } from '@/lib/integrations/registry';
import { MVP_PLUS_PILOT_PROFILE } from '@/lib/product/pilotProfile';
import { loadLatestSubscriptionIntent } from '@/lib/billing/subscriptionIntent';

describe('MR0 commercial and capability authority', () => {
  it('freezes a synthetic certification merchant without pretending a real pilot exists', () => {
    expect(MVP_PLUS_PILOT_PROFILE.merchant.kind).toBe('synthetic-controlled-certification');
    expect(MVP_PLUS_PILOT_PROFILE.stack).toEqual({
      commerce: 'shopify',
      helpdesk: 'gorgias',
      fulfilment: 'shipbob',
      carrier: 'ups',
      paymentAuthority: 'shopify_payments',
    });
    expect(MVP_PLUS_PILOT_PROFILE.supportOwner).toContain('controlled-certification role');
    expect(MVP_PLUS_PILOT_PROFILE.rollbackOwner).toContain('controlled-certification role');
    expect(MVP_PLUS_PILOT_PROFILE.limitations.join(' ')).toContain('required only before invitation or release');
  });

  it('keeps current billing readable while an environment is awaiting the MR0 intent table', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.subscription_intents' in the schema cache",
        },
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const client = { from: jest.fn().mockReturnValue(query) };

    await expect(loadLatestSubscriptionIntent(client as never, 'merchant-id')).resolves.toEqual({
      intent: null,
      availability: 'schema_pending',
    });
  });

  it('projects one plan contract into public pricing and entitlement tiers', () => {
    expect(LANDING_PRICING_TIERS.map((tier) => tier.key)).toEqual(PUBLIC_PLAN_IDS);
    for (const planId of PUBLIC_PLAN_IDS) {
      const plan = PLANS[planId];
      const publicPlan = LANDING_PRICING_TIERS.find((tier) => tier.key === planId);
      expect(publicPlan?.name).toBe(plan.name);
      expect(publicPlan?.features).toBe(plan.publicFeatures);
      expect(TIER_CONFIG[plan.tier].limits).toBe(plan.limits);
      expect(TIER_CONFIG[plan.tier].features).toBe(plan.entitlements);
    }
    expect(parseRequestedPlanId('starter')).toBe('pro');
    expect(parseRequestedPlanId('operating')).toBe('growth');
    expect(parseRequestedPlanId('ledger')).toBe('scale');
    expect(parseRequestedPlanId('made-up')).toBeNull();
    expect([TOP_UP_CREDITS, TOP_UP_PRICE_GBP]).toEqual([200, 15]);
  });

  it('derives every runtime credit cost from the billable event catalogue', () => {
    for (const [contextType, eventId] of Object.entries(CONTEXT_BILLABLE_EVENT)) {
      expect(CONTEXT_CREDIT_COSTS[contextType as keyof typeof CONTEXT_CREDIT_COSTS])
        .toBe(BILLABLE_EVENTS[eventId].credits);
    }
    expect(Object.keys(BILLABLE_EVENTS)).not.toContain('refund.issue');
    expect(Object.keys(BILLABLE_EVENTS)).not.toContain('request.deny');
    expect(Object.keys(BILLABLE_EVENTS)).not.toContain('claim.submit');
  });

  it('keeps provider maturity, merchant connection, object freshness, and actions separate', () => {
    const provider = getIntegrationProvider('shopify');
    if (!provider) throw new Error('Shopify provider missing');
    const status = projectProviderCapabilityStatus({
      item: {
        id: 'shopify',
        name: 'Shopify',
        category: 'commerce',
        status: 'connected',
        syncState: 'import_complete',
        importedRecords: 20,
        importedRecordsKnown: true,
        capabilities: [
          { id: 'orders.read', level: 'read', support: 'supported', scopes: [], description: '', availability: 'enabled', availabilityReason: '' },
        ],
        evidenceCapabilities: [
          { id: 'order_value', support: 'supported', availability: 'enabled', availabilityReason: '' },
        ],
      } as never,
      readModel: {
        providerId: 'shopify',
        configuration: 'configured',
        operational: 'healthy',
        bucket: 'healthy',
        badge: 'healthy',
        note: null,
        noteTone: 'neutral',
        syncState: 'import_complete',
        deliveryModel: 'continuous',
        freshnessConfidence: 'measured',
        lastDataReceivedAt: '2026-08-23T10:00:00.000Z',
        lastVerifiedAt: '2026-08-23T10:00:00.000Z',
        importedRecords: 20,
      } as never,
    });
    expect(status.buildMaturity).toBe(deriveProviderDisplayStage(provider));
    expect(status.merchantConnection).toBe('connected_read');
    expect(status.objectFamilyFreshness.orders).toBe('current');
    expect(status.objectFamilyFreshness.refunds).toBe('not_applicable');
    expect(status.actionCapabilities).toEqual(expect.objectContaining({
      refundIssue: 'unsupported_by_mvp',
      requestDeny: 'unsupported_by_mvp',
      claimSubmit: 'unsupported_by_mvp',
    }));
  });

  it('defines idempotent subscription intents, usage receipts, and exact reversal accounting', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260823100000_mr0_commercial_authority.sql'),
      'utf8',
    );
    expect(migration).toContain('subscription_intents_merchant_operation_idx');
    expect(migration).toContain('ensure_free_billing_account');
    expect(migration).toContain("('pro', 'Pro', 249, 1000)");
    expect(migration).toContain("('growth', 'Growth', 599, 5000)");
    expect(migration).toContain('subscription_intents_one_open_per_merchant_idx');
    expect(migration).toContain('context_credit_events_merchant_operation_idx');
    expect(migration).toContain('logical operation id conflicts with an existing receipt');
    expect(migration).toContain('monthly_credits_remaining + v_receipt.monthly_credits_spent');
    expect(migration).toContain('topup_credits_remaining + v_receipt.topup_credits_spent');
    expect(migration).toContain("status = 'reversed'");
    expect(migration).toContain('TO service_role');
    const webhooks = readFileSync(resolve(process.cwd(), 'lib/billing/stripeWebhooks.ts'), 'utf8');
    expect(webhooks).toContain("case 'checkout.session.completed'");
    expect(webhooks).toContain("case 'checkout.session.expired'");
    expect(webhooks).toContain('subscription_intent_id');
  });
});
