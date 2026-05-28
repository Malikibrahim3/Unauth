/**
 * Upsert a Gorgias row in support_provider_connections (service role).
 * Generates a per-connection webhook secret unless --webhook-secret is provided.
 *
 * Usage:
 *   npm run create:gorgias-support-connection -- \
 *     --merchant-id <uuid> \
 *     --account-id <gorgias_account_id> \
 *     --domain acme.gorgias.com \
 *     --name "Acme Gorgias" \
 *     [--webhook-secret <plaintext>]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { upsertGorgiasSupportConnection } from '../lib/support/gorgias/connectionStore';
import {
  generateGorgiasWebhookSecret,
  isGorgiasWebhookSecretSufficientLength,
} from '../lib/support/gorgias/webhookSecret';

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
  const merchantId = get('--merchant-id');
  const accountId = get('--account-id');
  const domain = get('--domain');
  const name = get('--name');
  const webhookSecret = get('--webhook-secret');

  if (!merchantId || (!accountId && !domain)) {
    throw new Error(
      'Usage: npm run create:gorgias-support-connection -- --merchant-id <uuid> (--account-id <id> | --domain <domain>) [--name <label>] [--webhook-secret <secret>]'
    );
  }

  return { merchantId, accountId, domain, name, webhookSecret };
}

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const { merchantId, accountId, domain, name, webhookSecret: cliSecret } = parseArgs(
    process.argv.slice(2)
  );

  const webhookSecretPlaintext = cliSecret ?? generateGorgiasWebhookSecret();
  if (!isGorgiasWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('Webhook secret must contain at least 32 bytes of entropy');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const connection = await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: accountId ?? null,
    domain: domain ?? null,
    provider_account_name: name ?? null,
    status: 'active',
    webhookSecretPlaintext,
    rotateWebhookSecret: Boolean(cliSecret),
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const webhookUrl = `${appUrl}/api/gorgias/support-webhook`;

  console.log('gorgias_connection_upserted', {
    id: connection.id,
    merchant_id: connection.merchant_id,
    provider_account_id: connection.provider_account_id,
    provider_base_url: connection.provider_base_url,
    webhook_url: webhookUrl,
  });

  console.log('');
  console.log('=== Gorgias webhook secret (shown once) ===');
  console.log(webhookSecretPlaintext);
  console.log('');
  console.log(
    'Configure Gorgias HTTP integration with header x-unauth-gorgias-secret (or x-gorgias-webhook-secret) set to this value.'
  );
  console.log('WARNING: Save this secret now. It cannot be retrieved again.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
