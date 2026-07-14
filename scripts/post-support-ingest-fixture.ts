/**
 * POST a fixture to the internal support ingest route (local dev).
 *
 * Usage:
 *   npm run post:support-ingest-fixture -- --merchant-id <uuid> --provider zendesk
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUPPORT_INGEST_SECRET_HEADER = 'x-unauth-internal-secret';

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
  const merchantIdx = argv.indexOf('--merchant-id');
  const providerIdx = argv.indexOf('--provider');
  const merchantId = merchantIdx >= 0 ? argv[merchantIdx + 1] : undefined;
  const provider = providerIdx >= 0 ? argv[providerIdx + 1] : 'zendesk';
  if (!merchantId) {
    throw new Error(
      'Usage: npm run post:support-ingest-fixture -- --merchant-id <uuid> [--provider zendesk|gorgias|intercom|freshdesk]'
    );
  }
  return { merchantId, provider };
}

function fixtureForProvider(provider: string, merchantId: string) {
  if (provider === 'gorgias') {
    return {
      merchant_id: merchantId,
      provider: 'gorgias',
      event_type: 'ticket_updated',
      shop_domain: 'fixture-shop.myshopify.com',
      raw: {
        id: 'fixture-gorgias-1007',
        uri: 'https://acme.gorgias.com/app/ticket/1007',
        subject: 'Refund for Shopify order #1007',
        status: 'open',
        tags: ['refund'],
        customer: { email: 'fixture-gorgias@unauth-smoke.example' },
        messages: [{ body: 'Please refund Shopify order #1007', from_agent: false }],
        created_datetime: '2026-05-28T14:00:00.000Z',
        updated_datetime: '2026-05-28T14:05:00.000Z',
      },
    };
  }

  return {
    merchant_id: merchantId,
    provider: 'zendesk',
    event_type: 'ticket_created',
    shop_domain: 'fixture-shop.myshopify.com',
    raw: {
      id: 88001,
      subject: 'Missing parcel ORD-2025-00341',
      description: 'Fixture ticket for internal ingest.',
      status: 'open',
      tags: ['missing_parcel'],
      requester: { email: 'fixture-zendesk@unauth-smoke.example' },
      created_at: '2026-05-28T14:00:00.000Z',
      updated_at: '2026-05-28T14:05:00.000Z',
    },
  };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const { merchantId, provider } = parseArgs(process.argv.slice(2));

  const secret =
    process.env.INTERNAL_SUPPORT_INGEST_SECRET ?? process.env.INTERNAL_HMAC_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!secret) {
    throw new Error('Set INTERNAL_SUPPORT_INGEST_SECRET (or INTERNAL_HMAC_SECRET) in .env.local');
  }

  const body = fixtureForProvider(provider, merchantId);
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/support/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [SUPPORT_INGEST_SECRET_HEADER]: secret,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error('ingest_failed', response.status, payload);
    process.exit(1);
  }

  console.log('ingest_ok', {
    support_case_id: payload.support_case_id,
    event_id: payload.event_id,
    external_case_id: payload.external_case_id,
    order_ref: payload.order_ref,
    claim_reason: payload.claim_reason,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
