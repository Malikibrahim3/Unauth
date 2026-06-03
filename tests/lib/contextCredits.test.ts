import {
  CONTEXT_CREDIT_COSTS,
  consumeContextCredits,
  getContextCreditSnapshot,
  PLAN_CONTEXT_CREDITS,
} from '@/lib/billing/contextCredits';

jest.mock('@/lib/billing/getMerchantTier', () => ({
  getMerchantSubscription: jest.fn(),
}));

import { getMerchantSubscription } from '@/lib/billing/getMerchantTier';

describe('context credits', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('defines the settled plan allowances and costs', () => {
    expect(PLAN_CONTEXT_CREDITS.free).toBe(50);
    expect(PLAN_CONTEXT_CREDITS.pro).toBe(1000);
    expect(PLAN_CONTEXT_CREDITS.growth).toBe(5000);
    expect(CONTEXT_CREDIT_COSTS.basic_context).toBe(1);
    expect(CONTEXT_CREDIT_COSTS.full_context).toBe(2);
    expect(CONTEXT_CREDIT_COSTS.evidence_summary).toBe(3);
  });

  it('computes remaining credits from current-period usage', async () => {
    (getMerchantSubscription as jest.Mock).mockResolvedValue({
      tier: 'pro',
      currentPeriodStart: '2026-06-01T00:00:00.000Z',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    });

    const supabase: any = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn().mockResolvedValue({
                data: [{ credits_spent: 2 }, { credits_spent: 3 }],
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    (getMerchantSubscription as jest.Mock).mockResolvedValue({
      tier: 'pro',
      contextCreditsMonthly: null,
      currentPeriodStart: '2026-06-01T00:00:00.000Z',
      currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    });

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

    const supabase: any = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lt: jest.fn().mockResolvedValue({
                data: Array.from({ length: 49 }, () => ({ credits_spent: 1 })),
                error: null,
              }),
            })),
          })),
        })),
      })),
      rpc: jest.fn().mockResolvedValue({
        data: { ok: false, used: 49, remaining: 1, credits_required: 2 },
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

    const rpc = jest.fn().mockResolvedValue({
      data: { ok: true, used: 1, remaining: 4999, credits_spent: 1 },
      error: null,
    });
    const selectChain = {
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lt: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      })),
    };
    const supabase: any = {
      from: jest.fn(() => ({
        select: jest.fn(() => selectChain),
      })),
      rpc,
    };

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
    expect(PLAN_CONTEXT_CREDITS.free).toBe(50);
    expect(PLAN_CONTEXT_CREDITS.pro).toBe(1000);
    expect(CONTEXT_CREDIT_COSTS.full_context).toBe(2);
  });
});
