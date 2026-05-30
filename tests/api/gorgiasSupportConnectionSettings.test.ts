import { NextRequest } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';
import {
  buildGorgiasSupportWebhookUrl,
  resolveGorgiasConnectionIdentity,
} from '@/lib/support/gorgias/settingsConnection';
import {
  generateGorgiasWebhookSecret,
  hashGorgiasWebhookSecret,
  verifyGorgiasWebhookSecret,
} from '@/lib/support/gorgias/webhookSecret';
import { verifyGorgiasWebhookAuth } from '@/lib/support/gorgias/webhookAuth';

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

jest.mock('@/lib/support/gorgias/ensureWidgetToken', () => ({
  createWidgetTokenForGorgiasSidebar: jest.fn(),
}));

jest.mock('@/lib/support/gorgias/registerSidebarWidget', () => ({
  registerGorgiasSidebarWidget: jest.fn(),
  deleteGorgiasSidebarWidget: jest.fn().mockResolvedValue(undefined),
  gorgiasApiBaseUrl: (url: string) => `${url.replace(/\/$/, '')}/api`,
  GorgiasSidebarRegistrationError: class GorgiasSidebarRegistrationError extends Error {
    status = 400;
    detail = 'mock';
  },
}));

jest.mock('@/lib/support/gorgias/registerSupportWebhook', () => ({
  registerGorgiasSupportWebhook: jest.fn(),
  deleteGorgiasSupportWebhookIntegration: jest.fn().mockResolvedValue(undefined),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { createWidgetTokenForGorgiasSidebar } from '@/lib/support/gorgias/ensureWidgetToken';
import { registerGorgiasSidebarWidget } from '@/lib/support/gorgias/registerSidebarWidget';
import { registerGorgiasSupportWebhook } from '@/lib/support/gorgias/registerSupportWebhook';
import { GET, POST } from '@/app/api/settings/gorgias/support-connection/route';
import { POST as rotatePost } from '@/app/api/settings/gorgias/support-connection/rotate-secret/route';
import { POST as disablePost } from '@/app/api/settings/gorgias/support-connection/disable/route';

const MERCHANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MERCHANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONNECTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const GORGIAS_ACCOUNT_ID = 'acme-gorgias-account';
const GORGIAS_DOMAIN = 'acme.gorgias.com';

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
  access_token_encrypted: null;
  refresh_token_encrypted: null;
  token_expires_at: null;
  scopes: unknown[];
};

function makeConnectionRow(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  const now = new Date().toISOString();
  return {
    id: CONNECTION_ID,
    merchant_id: MERCHANT_A,
    provider: 'gorgias',
    provider_account_id: GORGIAS_ACCOUNT_ID,
    provider_account_name: 'Acme',
    provider_base_url: `https://${GORGIAS_DOMAIN}`,
    status: 'active',
    last_sync_at: null,
    last_error: null,
    webhook_secret_hash: null,
    webhook_secret_created_at: null,
    webhook_secret_rotated_at: null,
    created_at: now,
    updated_at: now,
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    token_expires_at: null,
    scopes: [],
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
                rows[idx] = {
                  ...rows[idx],
                  ...payload,
                  updated_at: now,
                } as ConnectionRow;
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
                webhook_secret_rotated_at:
                  (payload.webhook_secret_rotated_at as string | null) ?? null,
                last_error: (payload.last_error as string | null) ?? null,
                access_token_encrypted:
                  (payload.access_token_encrypted as string | null) ?? null,
                scopes: (payload.scopes as unknown[]) ?? [],
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

function setupPermission(merchantId: string, manage = true) {
  (requirePermission as jest.Mock).mockImplementation(
    async (_service: unknown, _userId: string, permission: string) => {
      if (permission === 'manage_settings' && !manage) {
        return {
          denied: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
          ctx: null,
        };
      }
      return { denied: null, ctx: { merchantId, userId: 'user-1' } };
    }
  );
}

describe('Gorgias support connection settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.unauth.test';
    (createWidgetTokenForGorgiasSidebar as jest.Mock).mockResolvedValue({
      widgetToken: 'unauth_wt_abcd1234567890abcd1234567890ab',
    });
    (registerGorgiasSidebarWidget as jest.Mock).mockResolvedValue({
      integrationId: 101,
      widgetId: 202,
    });
    (registerGorgiasSupportWebhook as jest.Mock).mockResolvedValue({
      integrationId: 301,
    });
  });

  it('rejects unauthenticated GET', async () => {
    setupAuth(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns only the current merchant connection on GET', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase([
      makeConnectionRow({ merchant_id: MERCHANT_A }),
      makeConnectionRow({
        id: 'other-conn',
        merchant_id: MERCHANT_B,
        provider_account_id: 'other-account',
      }),
    ]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connection.merchant_id).toBeUndefined();
    expect(json.connection.id).toBe(CONNECTION_ID);
    expect(json.connection.webhook_secret_hash).toBeUndefined();
    expect(json.connection.webhook_secret_plaintext).toBeUndefined();
  });

  it('create returns plaintext secret once with correct webhook URL', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase();
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await POST(
      new NextRequest('http://localhost/api/settings/gorgias/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          account_id: GORGIAS_ACCOUNT_ID,
          name: 'Acme',
          gorgias_api_email: 'agent@acme.com',
          gorgias_api_key: 'gorgias-test-key',
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.webhook_secret_plaintext).toMatch(/^gorgias_whsec_/);
    expect(json.webhook_url).toBe(buildGorgiasSupportWebhookUrl());
    expect(json.header_name).toBe('x-unauth-gorgias-secret');
    expect(json.warning).toContain('will not be shown again');
    expect(json.connection.webhook_secret_configured).toBe(true);
    expect(json.sidebar_widget?.status).toBe('error');
    expect(json.sidebar_widget?.error).toContain('domain');
  });

  it('registers sidebar widget when domain and API credentials are provided', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase();
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await POST(
      new NextRequest('http://localhost/api/settings/gorgias/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: GORGIAS_DOMAIN,
          gorgias_api_email: 'agent@acme.com',
          gorgias_api_key: 'gorgias-test-key',
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sidebar_widget?.status).toBe('success');
    expect(json.sidebar_widget?.integration_id).toBe(101);
    expect(json.sidebar_widget?.widget_id).toBe(202);
    expect(registerGorgiasSidebarWidget).toHaveBeenCalled();
    expect(registerGorgiasSupportWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: GORGIAS_DOMAIN,
        webhookUrl: expect.stringContaining('/api/gorgias/support-webhook'),
      })
    );
    expect(json.support_webhook_auto_registered).toBe(true);
    expect(json.connection.support_webhook_registered).toBe(true);
    expect(json.connection.support_webhook_integration_id).toBe(301);
  });

  it('GET after create does not return plaintext or hash', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase();
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const createRes = await POST(
      new NextRequest('http://localhost/api/settings/gorgias/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          domain: GORGIAS_DOMAIN,
          gorgias_api_email: 'agent@acme.com',
          gorgias_api_key: 'gorgias-test-key',
        }),
      })
    );
    const created = await createRes.json();

    const getRes = await GET();
    const got = await getRes.json();
    expect(got.connection.webhook_secret_configured).toBe(true);
    expect(got.connection.sidebar_widget_registered).toBe(true);
    expect(got.connection.sidebar_integration_id).toBe(101);
    expect(got.connection.support_webhook_registered).toBe(true);
    expect(got.connection.support_webhook_integration_id).toBe(301);
    expect(got.connection.webhook_secret_plaintext).toBeUndefined();
    expect(got.connection.webhook_secret_hash).toBeUndefined();
    // Webhook auto-registered, so the plaintext secret is still returned (for rotation use)
    // but the UI won't show the manual setup panel.
    expect(created.support_webhook_auto_registered).toBe(true);
  });

  it('rotate returns new plaintext once and invalidates old secret', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const secretV1 = generateGorgiasWebhookSecret();
    const { supabase, rows } = makeSettingsSupabase([
      makeConnectionRow({
        webhook_secret_hash: hashGorgiasWebhookSecret(secretV1),
        webhook_secret_created_at: new Date().toISOString(),
      }),
    ]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const rotateRes = await rotatePost(
      new Request('http://localhost/api/settings/gorgias/support-connection/rotate-secret', {
        method: 'POST',
      })
    );
    expect(rotateRes.status).toBe(200);
    const rotated = await rotateRes.json();
    expect(rotated.webhook_secret_plaintext).toBeTruthy();
    expect(rotated.webhook_secret_plaintext).not.toBe(secretV1);

    const storedHash = rows[0].webhook_secret_hash;
    expect(verifyGorgiasWebhookSecret(secretV1, storedHash)).toBe(false);
    expect(verifyGorgiasWebhookSecret(rotated.webhook_secret_plaintext, storedHash)).toBe(true);
  });

  it('disabled connection is not matched for webhook ingest', async () => {
    const secret = generateGorgiasWebhookSecret();
    const disabledConnection = {
      id: CONNECTION_ID,
      merchant_id: MERCHANT_A,
      provider_account_id: GORGIAS_ACCOUNT_ID,
      provider_base_url: `https://${GORGIAS_DOMAIN}`,
      status: 'disabled',
      webhook_secret_hash: hashGorgiasWebhookSecret(secret),
    };

    const auth = verifyGorgiasWebhookAuth({
      headerSecret: secret,
      connection: disabledConnection,
      hasResolvedConnection: true,
    });
    expect(auth.ok).toBe(true);

    const { matchGorgiasSupportConnection } = await import('@/lib/support/gorgias/resolveConnection');
    const resolution = matchGorgiasSupportConnection(
      [disabledConnection],
      { provider_account_id: GORGIAS_ACCOUNT_ID, domain: null, provider_base_url: null, source: 'test' }
    );
    expect(resolution).toEqual({ error: 'not_found' });
  });

  it('disable sets status, wipes credentials, and keeps the row', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase, rows } = makeSettingsSupabase([makeConnectionRow()]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await disablePost(
      new Request('http://localhost/api/settings/gorgias/support-connection/disable', {
        method: 'POST',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connection.status).toBe('disabled');
    expect(rows).toHaveLength(1);
    // Credentials and webhook secret wiped on clean disconnect.
    expect(rows[0].access_token_encrypted).toBeNull();
    expect(rows[0].webhook_secret_hash).toBeNull();
  });

  it('normalizes domain and account identifiers', () => {
    const fromDomain = resolveGorgiasConnectionIdentity({ domain: 'HTTPS://Acme.Gorgias.com/' });
    expect(fromDomain.provider_account_id).toBe('acme.gorgias.com');
    expect(fromDomain.provider_base_url).toBe('https://acme.gorgias.com');

    const fromAccountField = resolveGorgiasConnectionIdentity({
      account_id: 'acme.gorgias.com',
    });
    expect(fromAccountField.domain).toBe('acme.gorgias.com');
  });

  it('update persists API credentials and registers sidebar when domain is known', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_A);
    const { supabase } = makeSettingsSupabase([
      makeConnectionRow({
        provider_account_id: GORGIAS_ACCOUNT_ID,
        provider_base_url: `https://${GORGIAS_DOMAIN}`,
        access_token_encrypted: null,
        status: 'error',
        last_error: 'Gorgias account domain is required to register the sidebar widget.',
      }),
    ]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await POST(
      new NextRequest('http://localhost/api/settings/gorgias/support-connection', {
        method: 'POST',
        body: JSON.stringify({
          account_id: GORGIAS_ACCOUNT_ID,
          gorgias_api_email: 'agent@acme.com',
          gorgias_api_key: 'gorgias-test-key',
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connection.gorgias_api_configured).toBe(true);
    expect(json.connection.sidebar_widget_registered).toBe(true);
    expect(json.sidebar_widget?.status).toBe('success');
    expect(registerGorgiasSidebarWidget).toHaveBeenCalled();
  });

  it('merchant B cannot read merchant A connection via scoped GET', async () => {
    setupAuth(true);
    setupPermission(MERCHANT_B);
    const { supabase } = makeSettingsSupabase([makeConnectionRow({ merchant_id: MERCHANT_A })]);
    (createServiceClient as jest.Mock).mockReturnValue(supabase);

    const res = await GET();
    const json = await res.json();
    expect(json.connection).toBeNull();
  });
});

describe('buildGorgiasSupportWebhookUrl', () => {
  it('uses configured app URL from env module', () => {
    expect(buildGorgiasSupportWebhookUrl()).toContain('/api/gorgias/support-webhook');
  });
});
