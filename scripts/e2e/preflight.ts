import './helpers/loadEnv'; // MUST be first — populates process.env before app modules load.

import { TABLES } from '@/lib/supabase/tables';
import { serviceClient } from './helpers/supabase';
import { getShopInfo } from './helpers/shopify';
import { getAccount } from './helpers/gorgias';
import {
  E2E_REQUIRED_VARS,
  getVar,
  gorgiasDomain,
  shopifyStoreDomain,
  webhookBaseUrl,
  supportWebhookUrl,
  ingestBaseUrl,
  ingestIsSplit,
} from './helpers/envVars';
import { arrow, blank, heading, info, pass, rule, statusLine, warn } from './helpers/log';

export type PreflightResult = { ok: boolean; merchantIdB: string | null };

function envPresent(name: string): boolean {
  if (name === 'SUPABASE_URL') {
    return !!(getVar('SUPABASE_URL') || getVar('NEXT_PUBLIC_SUPABASE_URL'));
  }
  return !!getVar(name);
}

// ---------------------------------------------------------------------------
// 1a — environment variables
// ---------------------------------------------------------------------------
function checkEnvVars(): { ok: boolean; missingRequired: string[] } {
  heading('Checking environment variables...');
  blank();
  const missingRequired: string[] = [];
  for (const spec of E2E_REQUIRED_VARS) {
    const present = envPresent(spec.name);
    if (present) {
      statusLine(true, spec.name, 'present');
    } else if (spec.optional) {
      statusLine('warn', spec.name, `MISSING — ${spec.note ?? 'optional'}`);
    } else {
      statusLine(false, spec.name, 'MISSING');
      missingRequired.push(spec.name);
    }
  }
  blank();
  if (missingRequired.length > 0) {
    const n = missingRequired.length;
    console.log(
      `${n} required var${n === 1 ? '' : 's'} missing. Add to .env.local and re-run preflight.`
    );
  }
  return { ok: missingRequired.length === 0, missingRequired };
}

// ---------------------------------------------------------------------------
// 1b — API connectivity
// ---------------------------------------------------------------------------
async function checkConnectivity(): Promise<boolean> {
  blank();
  heading('Checking API connectivity...');
  blank();
  let ok = true;

  // Shopify
  try {
    const shop = await getShopInfo();
    statusLine(true, 'Shopify Admin API', `connected (store: ${shop.myshopify_domain})`);
  } catch (err) {
    ok = false;
    statusLine(false, 'Shopify Admin API', `failed (${shopifyStoreDomain()})`);
    arrow(
      `Check SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN (needs read_orders, write_orders, read/write_customers). ${(err as Error).message}`
    );
  }

  // Gorgias
  try {
    await getAccount();
    statusLine(true, 'Gorgias API', `connected (account: ${gorgiasDomain().split('.')[0]})`);
  } catch (err) {
    ok = false;
    statusLine(false, 'Gorgias API', 'failed');
    arrow(`Check GORGIAS_BASE_URL, GORGIAS_API_EMAIL, GORGIAS_API_TOKEN. ${(err as Error).message}`);
  }

  // Supabase
  try {
    const { error } = await serviceClient()
      .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .select('id')
      .limit(1);
    if (error) throw new Error(error.message);
    statusLine(true, 'Supabase', 'connected');
  } catch (err) {
    ok = false;
    statusLine(false, 'Supabase', 'failed');
    arrow(`Check SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. ${(err as Error).message}`);
  }

  // Webhook URL reachability (registration target)
  try {
    const reachable = await isReachable(webhookBaseUrl(), supportWebhookUrl());
    if (reachable) {
      statusLine(true, 'Webhook URL', `reachable (${webhookBaseUrl()})`);
    } else {
      ok = false;
      statusLine(false, 'Webhook URL', `unreachable (${webhookBaseUrl()})`);
      arrow('Check E2E_WEBHOOK_URL — the app must be deployed and serving.');
    }
  } catch (err) {
    ok = false;
    statusLine(false, 'Webhook URL', `unreachable (${webhookBaseUrl()})`);
    arrow(`Check E2E_WEBHOOK_URL — the app must be deployed. ${(err as Error).message}`);
  }

  // Ingest delivery target (only when split from the registration URL)
  if (ingestIsSplit()) {
    try {
      const reachable = await isReachable(ingestBaseUrl(), `${ingestBaseUrl()}/api/gorgias/support-webhook`);
      if (reachable) {
        statusLine(true, 'Ingest URL (split)', `reachable (${ingestBaseUrl()})`);
      } else {
        ok = false;
        statusLine(false, 'Ingest URL (split)', `unreachable (${ingestBaseUrl()})`);
        arrow('E2E_INGEST_URL is set but not serving — start `npm run dev` or unset it.');
      }
    } catch {
      ok = false;
      statusLine(false, 'Ingest URL (split)', `unreachable (${ingestBaseUrl()})`);
    }
  }

  return ok;
}

async function isReachable(...urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status < 400) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 1c — primary merchant connection check (non-blocking)
// ---------------------------------------------------------------------------
async function checkPrimaryMerchantConnection(): Promise<void> {
  blank();
  heading('Checking primary merchant connection...');
  blank();
  const merchantId = getVar('E2E_MERCHANT_ID')!;
  const { data, error } = await serviceClient()
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id, status')
    .eq('merchant_id', merchantId)
    .eq('provider', 'gorgias')
    .eq('status', 'active')
    .limit(1);
  if (!error && data && data.length > 0) {
    pass('E2E_MERCHANT_ID has an active Gorgias connection');
  } else {
    warn('E2E_MERCHANT_ID has no active Gorgias connection in Supabase');
    arrow('Scenario 1 will create it. Or connect manually via the integrations UI first.');
  }
}

// ---------------------------------------------------------------------------
// 1d — second merchant auto-create
// ---------------------------------------------------------------------------
async function ensureSecondMerchant(): Promise<string | null> {
  blank();
  heading('Checking second merchant (E2E_MERCHANT_ID_B)...');
  blank();
  const svc = serviceClient();
  const configured = getVar('E2E_MERCHANT_ID_B');

  if (configured) {
    const { data, error } = await svc.from(TABLES.MERCHANTS).select('id').eq('id', configured).maybeSingle();
    if (!error && data) {
      statusLine(true, 'E2E_MERCHANT_ID_B', `exists (id: ${configured})`);
      return configured;
    }
    warn(`E2E_MERCHANT_ID_B=${configured} does not exist in the merchants table — auto-creating a replacement`);
  }

  // Auto-create: an auth user (FK target) + a merchant row.
  const email = `e2e-merchant-b+${Date.now()}@e2e-test.example.com`;
  let userId: string;
  try {
    const { data, error } = await svc.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data?.user) throw new Error(error?.message ?? 'no user returned');
    userId = data.user.id;
  } catch (err) {
    warn(`Could not auto-create the auth user for merchant B: ${(err as Error).message}`);
    arrow('Create a merchant manually and set E2E_MERCHANT_ID_B, or Scenario 6 will be skipped.');
    return null;
  }

  const { data: merchant, error: mErr } = await svc
    .from(TABLES.MERCHANTS)
    .insert({ user_id: userId, name: 'E2E Test Merchant B', is_internal: true })
    .select('id')
    .single();
  if (mErr || !merchant) {
    warn(`Could not insert merchant B: ${mErr?.message ?? 'unknown'}`);
    return null;
  }

  const newId = (merchant as { id: string }).id;
  // Make it usable for THIS run too.
  process.env.E2E_MERCHANT_ID_B = newId;
  statusLine(true, 'E2E_MERCHANT_ID_B', `auto-created (id: ${newId})`);
  blank();
  warn('Add this to .env.local before running the full suite:');
  console.log(`    E2E_MERCHANT_ID_B=${newId}`);
  blank();
  await waitForKeypress('  Press Enter to continue or Ctrl+C to exit and save first.');
  return newId;
}

async function waitForKeypress(message: string): Promise<void> {
  console.log(message);
  if (!process.stdin.isTTY) {
    info('(non-interactive shell — continuing without pause)');
    return;
  }
  await new Promise<void>((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.once('data', () => {
      stdin.setRawMode?.(false);
      stdin.pause();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// 1e — tunnel + secret-parity warnings
// ---------------------------------------------------------------------------
function tunnelAndParityWarnings(): void {
  const url = getVar('E2E_WEBHOOK_URL') ?? '';
  if (/ngrok|trycloudflare|tunnel/i.test(url)) {
    blank();
    warn('Tunnel URLs expire — if the suite fails with connection errors,');
    arrow('restart your tunnel and update E2E_WEBHOOK_URL in .env.local');
  }
  blank();
  warn('Signed webhooks require INTERNAL_HMAC_SECRET (and IDENTITY_SALT) here to');
  arrow('match the DEPLOYED app exactly — otherwise every webhook returns 401.');
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
export async function runPreflight(): Promise<PreflightResult> {
  const env = checkEnvVars();
  if (!env.ok) return { ok: false, merchantIdB: null };

  const connectivityOk = await checkConnectivity();
  if (!connectivityOk) return { ok: false, merchantIdB: getVar('E2E_MERCHANT_ID_B') ?? null };

  await checkPrimaryMerchantConnection();
  const merchantIdB = await ensureSecondMerchant();
  tunnelAndParityWarnings();

  blank();
  rule();
  console.log('Preflight complete — all checks passed');
  console.log('Ready to run: npx tsx scripts/e2e/runE2E.ts');
  rule();
  return { ok: true, merchantIdB };
}

// Direct invocation: `npx tsx scripts/e2e/preflight.ts`
const invokedDirectly = process.argv[1] && /preflight\.ts$/.test(process.argv[1]);
if (invokedDirectly) {
  runPreflight()
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
