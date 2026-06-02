import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import { buildFreshdeskSupportWebhookUrl } from '@/lib/support/freshdesk/settingsConnection';
import {
  hashFreshdeskWebhookSecret,
  verifyFreshdeskWebhookSecret,
} from '@/lib/support/freshdesk/webhookSecret';
import { verifyFreshdeskWebhookAuth } from '@/lib/support/freshdesk/webhookAuth';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: {
    VIEW_SETTINGS: 'view_settings',
    MANAGE_SETTINGS: 'manage_settings',
  },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/permissions/audit', () => ({
  logAction: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { GET, POST } from '@/app/api/settings/freshdesk/support-connection/route';
import { POST as rotatePost } from '@/app/api/settings/freshdesk/support-connection/rotate-secret/route';
import { POST as disablePost } from '@/app/api/settings/freshdesk/support-connection/disable/route';

const MERCHANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FRESHDESK_DOMAIN = 'acme.freshdesk.com';

type ConnectionRow = {
  id: string;
  merchant_id: string;
  provider: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_secret_hash: string | null;
  webhook_secret_created_at: string | null;
  webhook_secret_rotated_at: string | null;
  created_at: string;
  updated_at: string;
  access_token_encrypted: string | null;
};

function makeConnectionRow(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  const now = new Date().toISOString();
  return {
    id: CONNECTION_ID,
    merchant_id: MERCHANT_A,
    provider: 'freshdesk',
    provider_account_id: FRESHDESK_DOMAIN,
    provider_account_name: 'Acme',
    provider_base_url: `https://${FRESHDESK_DOMAIN}`,
    status: 'active',
    last_sync_at: null,
    last_error: null,
    webhook_secret_hash: null,
    webhook_secret_created_at: null,
    webhook_secret_rotated_at: null,
    created_at: now,
    updated_at: now,
    access_token_encrypted: 'encrypted-blob',
    ...overrides,
  };
}

function makeSettingsSupabase(initial: ConnectionRow[] = []) {
  const rows = [...initial];

  const supabase = {
    from: (table: string) => {
      if (table !== TABLES.SUPPORT_PROVIDER_CONNECTIONS) {
        throw new Error(`unexpected table ${table}`);
      }

      return {
        select: (_columns: string) => ({
          eq: (column: string, value: string) => {
            if (column === 'merchant_id') {
              return {
                eq: (_column2: string, provider: string) => ({
                  order: (_orderColumn: string, _opts: { ascending: boolean }) => ({
                    limit: (_n: number) => ({
                      maybeSingle: async () => {
                        const match = rows
                          .filter((row) => row.merchant_id === value && row.provider === provider)
                          .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
                        return { data: match[0] ?? null, error: null };
                      },
                    }),
                  }),
                }),
              };
            }
            throw new Error(`unexpected select filter ${column}=${value}`);
          },
        }),
        upsert: (payload: Record<string, unknown>, _opts: { onConflict: string }) => ({
          select: (_columns?: string) => ({
            single: async () => {
              const merchantId = payload.merchant_id as string;
              const provider = payload.provider as string;
              const accountId = (payload.provider_account_id as string | null) ?? null;
              const idx = rows.findIndex(
                (row) =>
                  row.merchant_id === merchantId &&
                  row.provider === provider &&
                  row.provider_account_id === accountId
              );
              const now = new Date().toISOString();
              if (idx >= 0) {
                rows[idx] = { ...rows[idx], ...payload, updated_at: now } as ConnectionRow;
                return { data: rows[idx], error: null };
              }
              const inserted = makeConnectionRow({
                id: `conn-${rows.length + 1}`,
                merchant_id: merchantId,
                provider,
                provider_account_id: accountId,
                provider_account_name: (payload.provider_account_name as string | null) ?? null,
                provider_base_url: (payload.provider_base_url as string | null) ?? null,
                status: (payload.status as string) ?? 'active',
                webhook_secret_hash: (payload.webhook_secret_hash as string | null) ?? null,
                webhook_secret_created_at:
                  (payload.webhook_secret_created_at as string | null) ?? now,
                last_error: (payload.last_error as string | null) ?? null,
                access_token_encrypted:
                  (payload.access_token_encrypted as string | null) ?? null,
                updated_at: now,
                created_at: now,
              });
              rows.push(inserted);
              return { data: inserted, error: null };
            },
          }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => ({
            eq: (_column2: string, merchantId: string) => ({
              select: (_columns: string) => ({
                single: async () => {
                  const idx = rows.findIndex(
                    (row) => row.id === id && row.merchant_id === merchantId
                  );
                  if (idx < 0) return { data: null, error: null };
                  rows[idx] = {
                    ...rows[idx],
                    ...values,
                    updated_at: new Date().toISOString(),
                  } as ConnectionRow;
                  return { data: rows[idx], error: null };
                },
              }),
            }),
          }),
        }),
      };
    },
  };

  return { supabase, rows };
}

function setupAuth(ok: boolean) {
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: ok ? { id: 'user-1' } : null } }) },
  });
}

function setupPermission(merchantId: string) {
  (requirePermission as jest.Mock).mockImplementation(
    async (_service: unknown, _userId: string, permission: string) => {
      if (permission === 'manage_settings') {
        return { denied: null, ctx: { merchantId, userId: 'user-1' } };
      }
      return { denied: null, ctx: { merchantId, userId: 'user-1' } };
    }
  );
}

describe('Freshdesk support connection settings API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.unauth.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [] }),
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects unauthenticated GET', async () => {
    setupAuth(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('create returns plaintext secret and registration webhook URL', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase();
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await POST(
      new NextRequest('http://localhost/api/settings/freshdesk/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: 'acme',
          name: 'Acme',
          freshdesk_api_key: 'freshdesk-test-key',
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.webhook_secret_plaintext).toMatch(/^freshdesk_whsec_/);
    expect(json.webhook_url).toContain('freshdesk_domain=acme.freshdesk.com');
    expect(json.webhook_url).toContain('unauth_whsec=');
    expect(json.manual_webhook_setup).toBe(true);
    expect(json.connection.freshdesk_api_configured).toBe(true);
  });

  it('rejects invalid Freshdesk credentials with 422', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase();
    (createServiceClient as jest.Mock).mockReturnValue(supabase);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }) as typeof fetch;

    const res = await POST(
      new NextRequest('http://localhost/api/settings/freshdesk/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: FRESHDESK_DOMAIN,
          freshdesk_api_key: 'bad-key',
        }),
      })
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe('freshdesk_credentials_invalid');
  });

  it('rotate secret returns new plaintext once', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const secret = 'freshdesk_whsec_abcdefghijklmnopqrstuvwxyz0123456789AB';
    const { supabase } = makeSettingsSupabase([
      makeConnectionRow({ webhook_secret_hash: hashFreshdeskWebhookSecret(secret) }),
    ]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await rotatePost(new Request('http://localhost/rotate', { method: 'POST' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.webhook_secret_plaintext).toMatch(/^freshdesk_whsec_/);
    expect(json.webhook_secret_plaintext).not.toBe(secret);
  });

  it('disable clears credentials and webhook secret', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase, rows } = makeSettingsSupabase([makeConnectionRow()]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await disablePost(new Request('http://localhost/disable', { method: 'POST' }));
    expect(res.status).toBe(200);
    expect(rows[0].status).toBe('disabled');
    expect(rows[0].access_token_encrypted).toBeNull();
    expect(rows[0].webhook_secret_hash).toBeNull();
  });
});

describe('Freshdesk webhook secret helpers', () => {
  it('hashes and verifies webhook secrets', () => {
    const secret = 'freshdesk_whsec_abcdefghijklmnopqrstuvwxyz0123456789AB';
    const hash = hashFreshdeskWebhookSecret(secret);
    expect(verifyFreshdeskWebhookSecret(secret, hash)).toBe(true);
    expect(verifyFreshdeskWebhookSecret('wrong', hash)).toBe(false);
  });

  it('buildFreshdeskSupportWebhookUrl embeds domain and secret for registration', () => {
    const url = buildFreshdeskSupportWebhookUrl({
      domain: FRESHDESK_DOMAIN,
      webhookSecretPlaintext: 'freshdesk_whsec_testsecretvalue0123456789abcdef',
    });
    expect(url).toContain('/api/freshdesk/support-webhook');
    expect(url).toContain('freshdesk_domain=acme.freshdesk.com');
    expect(url).toContain('unauth_whsec=');
  });

  it('verifyFreshdeskWebhookAuth accepts connection hash', () => {
    const secret = 'freshdesk_whsec_abcdefghijklmnopqrstuvwxyz0123456789AB';
    const hash = hashFreshdeskWebhookSecret(secret);
    const result = verifyFreshdeskWebhookAuth({
      headerSecret: secret,
      connection: { webhook_secret_hash: hash },
      hasResolvedConnection: true,
    });
    expect(result.ok).toBe(true);
  });
});
