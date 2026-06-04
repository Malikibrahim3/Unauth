import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import { POST } from '@/app/api/gorgias/support-webhook/route';
import { createMemoryClient, rowsOf, type MemoryClient } from '@/tests/lib/supabaseMemoryClient';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createServiceClient: jest.Mock;
};

const URL = 'http://localhost/api/gorgias/support-webhook';

describe('POST /api/gorgias/support-webhook — webhook_logs', () => {
  let client: MemoryClient;

  beforeEach(() => {
    client = createMemoryClient();
    createServiceClient.mockReturnValue(client);
  });

  it('returns 400 and logs a validation_error for invalid JSON', async () => {
    const request = new NextRequest(URL, { method: 'POST', body: 'not-json{' });
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
    const request = new NextRequest(URL, { method: 'POST', body: JSON.stringify({ ticket: {} }) });
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
