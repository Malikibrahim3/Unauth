import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { MANAGE_SETTINGS: 'manage_settings' },
  requirePermission: jest.fn(),
}));
jest.mock('@/lib/billing/merchantBilling', () => ({ getMerchantBillingState: jest.fn() }));
jest.mock('@/lib/billing/lifecycle', () => ({
  applyPlanUpgrade: jest.fn(),
  scheduleDowngrade: jest.fn(),
}));
jest.mock('@/lib/billing/stripeClient', () => ({
  cancelSubscriptionAtPeriodEnd: jest.fn(),
  clearSubscriptionCancellation: jest.fn(),
  createSubscriptionCheckoutSession: jest.fn(),
  createTopUpCheckoutSession: jest.fn(),
  createBillingPortalSession: jest.fn(),
  isStripeConfigured: jest.fn(),
  upgradeSubscriptionImmediate: jest.fn(),
}));
jest.mock('@/lib/billing/planStripeIds', () => ({ getPlanStripePriceId: jest.fn() }));
jest.mock('@/lib/billing/plans', () => ({
  PLANS: { scale: { name: 'Scale' }, growth: { name: 'Growth' }, pro: { name: 'Pro' }, free: { name: 'Free' } },
  isDowngrade: jest.fn(),
  isUpgrade: jest.fn(),
}));
jest.mock('@/lib/billing/subscriptionIntent', () => ({
  persistSubscriptionIntent: jest.fn(),
  markSubscriptionIntentStatus: jest.fn(),
  markSubscriptionIntentStatusById: jest.fn(),
}));
jest.mock('@/lib/testing/remainingClosureGuard', () => ({ isRemainingClosureFixtureRequest: jest.fn() }));
jest.mock('@/lib/utils/appUrl', () => ({ getAppUrl: jest.fn(() => 'http://127.0.0.1:3016') }));
jest.mock('@/lib/auth/safeRedirect', () => ({ safeRedirectPath: jest.fn((value: string) => value) }));
jest.mock('@/lib/email/send', () => ({ sendEmail: jest.fn() }));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { getMerchantBillingState } from '@/lib/billing/merchantBilling';
import { scheduleDowngrade } from '@/lib/billing/lifecycle';
import { isStripeConfigured } from '@/lib/billing/stripeClient';
import { isDowngrade } from '@/lib/billing/plans';
import {
  markSubscriptionIntentStatus,
  persistSubscriptionIntent,
} from '@/lib/billing/subscriptionIntent';
import { isRemainingClosureFixtureRequest } from '@/lib/testing/remainingClosureGuard';
import { POST } from '@/app/api/billing/actions/route';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const MERCHANT_ID = '10000000-0000-4000-8000-000000000010';

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://127.0.0.1:3016/api/billing/actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function setup(providerFree = true) {
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID, email: 'owner@example.invalid' } } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue({});
  (requirePermission as jest.Mock).mockResolvedValue({
    denied: null,
    ctx: { merchantId: MERCHANT_ID, userId: USER_ID, role: 'owner' },
  });
  (getMerchantBillingState as jest.Mock).mockResolvedValue({
    subscription: {
      id: 'subscription-1',
      planId: 'scale',
      currentPeriodStart: '2026-08-01T00:00:00.000Z',
      currentPeriodEnd: '2026-09-01T00:00:00.000Z',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
  });
  (isRemainingClosureFixtureRequest as jest.Mock).mockResolvedValue(providerFree);
  (isDowngrade as jest.Mock).mockReturnValue(true);
  (isStripeConfigured as jest.Mock).mockReturnValue(false);
  (persistSubscriptionIntent as jest.Mock).mockResolvedValue({
    id: 'intent-1', planId: 'growth', status: 'pending', duplicate: false,
  });
  (scheduleDowngrade as jest.Mock).mockResolvedValue({ effectiveDate: '2026-09-01T00:00:00.000Z' });
}

describe('provider-free remaining closure downgrade', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('schedules only a lower plan, records a pending intent, and suppresses email', async () => {
    const response = await POST(request(
      { action: 'downgrade', planId: 'growth' },
      { 'idempotency-key': 'remaining-closure-downgrade-001' },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      providerProvenance: 'local-acceptance-provider-free',
      localAcceptance: true,
      subscriptionIntent: { id: 'intent-1', status: 'pending' },
    });
    expect(scheduleDowngrade).toHaveBeenCalledWith(expect.anything(), MERCHANT_ID, 'growth', { sendEmail: false });
    expect(markSubscriptionIntentStatus).not.toHaveBeenCalled();
  });

  it('does not let any other action enter the local provider-free branch', async () => {
    const response = await POST(request({ action: 'upgrade', planId: 'growth' }));

    expect(response.status).toBe(400);
    expect(persistSubscriptionIntent).not.toHaveBeenCalled();
    expect(scheduleDowngrade).not.toHaveBeenCalled();
  });

  it('falls back to the ordinary production contract when the exact guard fails', async () => {
    setup(false);
    process.env.NODE_ENV = 'production';

    const response = await POST(request({ action: 'downgrade', planId: 'growth' }));

    expect(response.status).toBe(503);
    expect(scheduleDowngrade).not.toHaveBeenCalled();
  });
});
