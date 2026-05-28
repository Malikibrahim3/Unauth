/**
 * POST a Gorgias ticket fixture to /api/gorgias/support-webhook (local dev).
 *
 * Connection routing (production-style):
 *   npm run post:gorgias-webhook-fixture -- --account-id acme-account-1
 *   npm run post:gorgias-webhook-fixture -- --domain acme.gorgias.com
 *
 * Dev merchant fallback:
 *   npm run post:gorgias-webhook-fixture -- --merchant-id <uuid>
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  GORGIAS_ACCOUNT_ID_HEADER,
  GORGIAS_DOMAIN_HEADER,
} from '../lib/support/gorgias/accountIdentity';

const SECRET_HEADERS = ['x-unauth-gorgias-secret', 'x-gorgias-webhook-secret'] as const;

function loadEnvLocal(): void {
  const envPath = join(__dirname, '../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    merchantId: get('--merchant-id'),
    accountId: get('--account-id'),
    domain: get('--domain'),
    shopDomain: get('--shop-domain'),
    orderRef: get('--order-ref'),
    baseUrl: get('--base-url'),
  };
}

function resolveWebhookBaseUrl(cliBaseUrl?: string): string {
  if (cliBaseUrl?.trim()) return cliBaseUrl.trim().replace(/\/$/, '');

  const configured =
    process.env.GORGIAS_WEBHOOK_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  if (process.env.GORGIAS_WEBHOOK_FORCE_REMOTE === 'true') {
    return configured.replace(/\/$/, '');
  }

  const isRemoteHosted = /vercel\.app|\.unauth\.co/i.test(configured);
  if (isRemoteHosted) {
    return (process.env.GORGIAS_WEBHOOK_LOCAL_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  return configured.replace(/\/$/, '');
}

async function main(): Promise<void> {
  loadEnvLocal();

  const secret = process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET;
  const { merchantId, accountId, domain, shopDomain, orderRef, baseUrl: cliBaseUrl } = parseArgs(
    process.argv.slice(2)
  );
  const baseUrl = resolveWebhookBaseUrl(cliBaseUrl);
  if (!secret) {
    throw new Error('Set GORGIAS_SUPPORT_WEBHOOK_SECRET in .env.local');
  }

  if (!merchantId && !accountId && !domain) {
    throw new Error(
      'Provide --account-id, --domain (connection routing), or --merchant-id (dev fallback)'
    );
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    [SECRET_HEADERS[0]]: secret,
  };

  if (merchantId) {
    headers['x-unauth-merchant-id'] = merchantId;
  }
  if (accountId) {
    headers[GORGIAS_ACCOUNT_ID_HEADER] = accountId;
  }
  if (domain) {
    headers[GORGIAS_DOMAIN_HEADER] = domain;
  }

  const resolvedOrderRef = orderRef ?? '1007';
  const ticket = {
    id: 'g-500',
    subject: `Refund for Shopify order #${resolvedOrderRef.replace(/^#/, '')}`,
    status: 'open',
    tags: ['refund'],
    customer: { email: 'shopper@example.com' },
    messages: [{ body: `Please refund Shopify order #${resolvedOrderRef.replace(/^#/, '')}`, from_agent: false }],
    created_datetime: '2026-05-28T09:00:00.000Z',
    updated_datetime: '2026-05-28T09:30:00.000Z',
  };

  const webhookUrl = new URL(`${baseUrl.replace(/\/$/, '')}/api/gorgias/support-webhook`);
  if (shopDomain) {
    webhookUrl.searchParams.set('shop_domain', shopDomain);
  }

  const response = await fetch(webhookUrl.toString(), {
    method: 'POST',
    headers: {
      ...headers,
      ...(shopDomain ? { 'x-unauth-shop-domain': shopDomain } : {}),
    },
    body: JSON.stringify(ticket),
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error('gorgias_webhook_failed', response.status, payload);
    process.exit(1);
  }

  console.log('gorgias_webhook_ok', {
    support_case_id: payload.support_case_id,
    event_id: payload.event_id,
    external_case_id: payload.external_case_id,
    order_ref: payload.order_ref,
    claim_reason: payload.claim_reason,
    link_status: payload.link_status,
    shopify_order_id: payload.shopify_order_id ?? null,
    customer_profile_id: payload.customer_profile_id ?? null,
    merchant_claim_id: payload.merchant_claim_id ?? null,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
