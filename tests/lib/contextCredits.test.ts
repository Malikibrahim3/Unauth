import {
  CONTEXT_CREDIT_COSTS,
  consumeContextCredits,
  getContextCreditSnapshot,
  PLAN_CONTEXT_CREDITS,
} from '@/lib/billing/contextCredits';

jest.mock('@/lib/billing/getMerchantTier', () => ({
  getMerchantSubscription: jest.fn(),
}));

jest.mock('@/lib/billing/merchantBilling', () => ({
  getMerchantBillingState: jest.fn(),
  getMerchantCreditsRow: jest.fn(),
}));

import { getMerchantSubscription } from '@/lib/billing/getMerchantTier';
import { getMerchantBillingState } from '@/lib/billing/merchantBilling';

describe('context credits', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('defines the settled plan allowances and costs', () => {
    expect(PLAN_CONTEXT_CREDITS.free).toBe(100);
    expect(PLAN_CONTEXT_CREDITS.pro).toBe(1000);
    expect(PLAN_CONTEXT_CREDITS.growth).toBe(5000);
    expect(CONTEXT_CREDIT_COSTS.basic_context).toBe(1);
    expect(CONTEXT_CREDIT_COSTS.full_context).toBe(2);
    expect(CONTEXT_CREDIT_COSTS.evidence_summary).toBe(3);
  });

  it('computes remaining credits from current-period usage', async () => {
    (getMerchantSubscription as jest.Mock).mockResolvedValue({
      tier: 'pro',
      contextCreditsMonthly: null,
      currentPeriodStart: '2026-06-01T00:00:00.000Z',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    });
    (getMerchantBillingState as jest.Mock).mockResolvedValue({
      credits: { monthlyCreditsRemaining: 995, topupCreditsRemaining: 0 },
      usedThisCycle: 5,
    });

    const supabase: any = { from: jest.fn(), rpc: jest.fn() };

    const snapshot = await getContextCreditSnapshot(supabase, 'merchant-1');
    expect(snapshot.tier).toBe('pro');
    expect(snapshot.allowanceConfigured).toBe(true);
    expect(snapshot.used).toBe(5);
    expect(snapshot.remaining).toBe(995);
  });

  it('blocks unlocks when remaining credits are insufficient', async () => {
    (getMerchantSubscription as jest.Mock).mockResolvedValue({
      tier: 'free',
      currentPeriodStart: '2026-06-01T00:00:00.000Z',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    });
    (getMerchantBillingState as jest.Mock).mockResolvedValue({
      credits: { monthlyCreditsRemaining: 1, topupCreditsRemaining: 0 },
      usedThisCycle: 99,
    });

    const supabase: any = {
      rpc: jest.fn().mockResolvedValue({
        data: { ok: false, used: 99, remaining: 1, credits_required: 2 },
        error: null,
      }),
    };

    const result = await consumeContextCredits(supabase, {
      merchantId: 'merchant-1',
      contextType: 'full_context',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.snapshot.remaining).toBe(1);
      expect(result.creditsRequired).toBe(2);
    }
  });

  it('writes an audit event when credits are consumed via RPC', async () => {
    (getMerchantSubscription as jest.Mock).mockResolvedValue({
      tier: 'growth',
      currentPeriodStart: '2026-06-01T00:00:00.000Z',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    });
    (getMerchantBillingState as jest.Mock).mockResolvedValue({
      credits: { monthlyCreditsRemaining: 5000, topupCreditsRemaining: 0 },
      usedThisCycle: 0,
    });

    const rpc = jest.fn().mockResolvedValue({
      data: { ok: true, used: 1, remaining: 4999, credits_spent: 1, monthly_remaining: 4999, topup_remaining: 0 },
      error: null,
    });
    const supabase: any = { rpc };

    const result = await consumeContextCredits(supabase, {
      merchantId: 'merchant-1',
      userId: 'user-1',
      contextType: 'basic_context',
      claimId: 'claim-1',
      ticketRef: 'T-1',
      orderRef: 'ORD-1',
      customerRef: 'C-1',
      reason: 'delivery_dispute',
    });

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'consume_context_credits_if_available',
      expect.objectContaining({
        p_merchant_id: 'merchant-1',
        p_user_id: 'user-1',
        p_context_type: 'basic_context',
        p_credits_to_spend: 1,
        p_claim_id: 'claim-1',
        p_ticket_ref: 'T-1',
        p_order_ref: 'ORD-1',
        p_customer_ref: 'C-1',
        p_reason: 'delivery_dispute',
        p_plan_tier: 'growth',
      }),
    );
  });

  it('free and pro tiers can use full network context when credits remain', () => {
    expect(PLAN_CONTEXT_CREDITS.free).toBe(100);
    expect(PLAN_CONTEXT_CREDITS.pro).toBe(1000);
    expect(CONTEXT_CREDIT_COSTS.full_context).toBe(2);
  });
});
