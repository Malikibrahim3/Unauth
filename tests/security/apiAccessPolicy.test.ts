import fs from 'node:fs';
import path from 'node:path';

jest.mock('@/lib/supabase/server', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/billing/merchantBilling', () => ({ getMerchantSubscriptionRow: jest.fn() }));
jest.mock('@/lib/api/v1/rateLimit', () => ({ incrementAndCheckApiKeyMinuteLimit: jest.fn() }));
jest.mock('@/lib/ratelimit', () => ({ getClientIp: jest.fn(() => '192.0.2.9') }));

import { createServiceClient } from '@/lib/supabase/server';
import { getMerchantSubscriptionRow } from '@/lib/billing/merchantBilling';
import { incrementAndCheckApiKeyMinuteLimit } from '@/lib/api/v1/rateLimit';
import { validateApiKeyPlaintext } from '@/lib/api/validateApiKey';

const KEY = `unauth_sk_${'a'.repeat(32)}`;
const MERCHANT_ID = '10000000-0000-4000-8000-000000000001';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function setup(scopes = ['customers:read']) {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.maybeSingle = jest.fn().mockResolvedValue({
    data: { id: 'key-1', merchant_id: MERCHANT_ID, rate_limit_per_minute: 30, revoked_at: null, scopes },
    error: null,
  });
  builder.update = jest.fn(() => builder);
  builder.then = jest.fn((callback: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(callback));
  (createServiceClient as jest.Mock).mockReturnValue({ from: jest.fn(() => builder) });
  (getMerchantSubscriptionRow as jest.Mock).mockResolvedValue({ planId: 'scale', status: 'active' });
  (incrementAndCheckApiKeyMinuteLimit as jest.Mock).mockResolvedValue({ allowed: true, count: 1 });
}

describe('machine API server policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('denies an otherwise valid key when provider-confirmed Scale entitlement is absent', async () => {
    (getMerchantSubscriptionRow as jest.Mock).mockResolvedValue({ planId: 'pro', status: 'active' });
    expect(await validateApiKeyPlaintext(KEY, '192.0.2.9', 'customers:read')).toEqual({
      status: 403,
      message: 'Machine API access is not enabled for this workspace',
    });
    expect(incrementAndCheckApiKeyMinuteLimit).not.toHaveBeenCalled();
  });

  it.each([
    [{ planId: 'scale', status: 'past_due' }],
    [{ planId: 'scale', status: 'cancelled' }],
    [null],
  ])('denies non-live subscription state %j', async (subscription) => {
    (getMerchantSubscriptionRow as jest.Mock).mockResolvedValue(subscription);
    expect(await validateApiKeyPlaintext(KEY, '192.0.2.9', 'customers:read')).toMatchObject({ status: 403 });
  });

  it('requires the endpoint scope before consuming the durable rate counter', async () => {
    setup([]);
    expect(await validateApiKeyPlaintext(KEY, '192.0.2.9', 'cases:read')).toEqual({
      status: 403,
      message: 'API key is missing required scope: cases:read',
    });
    expect(incrementAndCheckApiKeyMinuteLimit).not.toHaveBeenCalled();
  });

  it('enforces the selected per-key rate and fails closed when its counter fails', async () => {
    (incrementAndCheckApiKeyMinuteLimit as jest.Mock).mockResolvedValueOnce({ allowed: false, count: 31 });
    expect(await validateApiKeyPlaintext(KEY, '192.0.2.9', 'customers:read')).toMatchObject({ status: 429 });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (incrementAndCheckApiKeyMinuteLimit as jest.Mock).mockRejectedValueOnce(new Error('counter unavailable'));
    expect(await validateApiKeyPlaintext(KEY, '192.0.2.9', 'customers:read')).toMatchObject({ status: 500 });
    consoleError.mockRestore();
  });

  it('routes every retained machine endpoint through a declared scope', () => {
    const contracts: Record<string, string> = {
      'app/api/v1/customers/route.ts': "validateApiKey(request, 'customers:read')",
      'app/api/v1/profile-link/route.ts': "validateApiKey(request, 'customers:read')",
      'app/api/v1/helpdesk-ticket-context/route.ts': "validateApiKey(request, 'cases:read')",
      'app/api/v1/lookup/route.ts': "validateApiKey(request, 'lookup:read')",
      'app/api/v1/evidence/route.ts': "validateApiKey(request, 'evidence:write')",
      'app/api/v1/evidence/[id]/pdf/route.ts': "validateApiKey(request, 'evidence:read')",
      'app/api/v1/evidence/[id]/signed-url/route.ts': "validateApiKey(request, 'evidence:read')",
      'app/api/v1/gate/evaluate/route.ts': "validateApiKey(request, 'cases:write')",
      'app/api/v1/gate/escalation/route.ts': "validateApiKey(request, 'cases:write')",
      'app/api/claim-gate/check/route.ts': "validateApiKey(req, 'cases:write')",
      'app/api/v1/ingest/customers/route.ts': "authenticateIngest(req, 'imports:write')",
      'app/api/v1/ingest/orders/route.ts': "authenticateIngest(req, 'imports:write')",
      'app/api/v1/ingest/cases/route.ts': "authenticateIngest(req, 'imports:write')",
      'app/api/v1/ingest/events/route.ts': "authenticateIngest(req, 'imports:write')",
      'app/api/v1/ingest/events/[eventId]/route.ts': "authenticateIngest(request, 'imports:read')",
    };
    for (const [file, contract] of Object.entries(contracts)) expect(read(file)).toContain(contract);
  });
});
