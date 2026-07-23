import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import { POST } from '@/app/api/gorgias/support-webhook/route';
import { createMemoryClient, rowsOf, type MemoryClient } from '@/tests/lib/supabaseMemoryClient';
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/gorgias/supportConnectionShared';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/ingestWebhook', () => ({
  ...jest.requireActual('@/lib/support/gorgias/ingestWebhook'),
  authenticateGorgiasSupportWebhook: jest.fn(),
}));

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};
const { authenticateGorgiasSupportWebhook } = jest.requireMock(
  '@/lib/support/gorgias/ingestWebhook',
) as { authenticateGorgiasSupportWebhook: jest.Mock };

const URL = 'http://localhost/api/gorgias/support-webhook';
const MERCHANT_ID = '11111111-1111-4111-8111-111111111111';

describe('POST /api/gorgias/support-webhook — webhook_logs', () => {
  let client: MemoryClient;

  beforeEach(() => {
    client = createMemoryClient();
    createServiceClient.mockReturnValue(client);
    authenticateGorgiasSupportWebhook.mockResolvedValue({
      merchantId: MERCHANT_ID,
      connection: null,
      providerConnectionId: null,
    });
  });

  it('returns 400 and logs a validation_error for invalid JSON', async () => {
    const request = new NextRequest(URL, {
      method: 'POST',
      headers: {
        [GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME]: 'test-secret-present',
        'x-unauth-merchant-id': MERCHANT_ID,
      },
      body: 'not-json{',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_json' });

    const logs = rowsOf(client, TABLES.WEBHOOK_LOGS);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      provider: 'gorgias',
      status: 'validation_error',
      http_status: 400,
      error: 'invalid_json',
    });
  });

  it('returns 400 and logs a validation_error for a malformed ticket payload', async () => {
    const request = new NextRequest(URL, {
      method: 'POST',
      headers: {
        [GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME]: 'test-secret-present',
        'x-unauth-merchant-id': MERCHANT_ID,
      },
      body: JSON.stringify({ ticket: {} }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: 'invalid_ticket_payload' });

    const logs = rowsOf(client, TABLES.WEBHOOK_LOGS);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      provider: 'gorgias',
      status: 'validation_error',
      http_status: 400,
    });
    expect(String(logs[0].error)).toContain('invalid_ticket_payload');
  });
});
