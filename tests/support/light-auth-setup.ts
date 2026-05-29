import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { TABLES } from '../../lib/supabase/tables';
import { hashSignedToken, makeSignedToken } from '../../lib/api/signedAccess';

const AUTH_DIR = path.join(__dirname, '.auth');
const CREDENTIALS_PATH = path.join(__dirname, '../.test-credentials.json');
const VIEW_TOKEN_PATH = path.join(__dirname, '.profile-view-token.json');

/** Merchant/profile with live linked Gorgias support cases from verification. */
const LIVE_PROFILE_MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const LIVE_PROFILE_ID = '6ac24686-2fd4-4a27-9eb3-cb1751a9548c';

function loadEnvLocal(): void {
  const envPath = path.join(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export default async function lightAuthSetup(config: FullConfig): Promise<void> {
  loadEnvLocal();
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  const email = `support-ui-${Date.now()}@unauth-test-automation.com`;
  const password = 'PlaywrightTest!2026#Secure';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { is_test_account: true, created_by: 'support-ui-playwright' },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  await supabase.from(TABLES.MERCHANTS).upsert({
    user_id: authData.user.id,
    name: 'Support UI Playwright Store',
    monthly_order_volume: '500-2000',
    primary_fraud_concern: 'refund_abuse',
    setup_complete: true,
    created_at: new Date().toISOString(),
  });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify({ email, password, userId: authData.user.id }, null, 2)
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|upload|claims|customers|onboarding)/, { timeout: 60000 });
    await page.context().storageState({ path: path.join(AUTH_DIR, 'user.json') });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const viewToken = makeSignedToken({
      profile_id: LIVE_PROFILE_ID,
      merchant_id: LIVE_PROFILE_MERCHANT_ID,
      expires_at: expiresAt,
    });
    await supabase.from(TABLES.PROFILE_VIEW_TOKENS).insert({
      profile_id: LIVE_PROFILE_ID,
      merchant_id: LIVE_PROFILE_MERCHANT_ID,
      token_hash: hashSignedToken(viewToken),
      expires_at: expiresAt,
    });
    fs.writeFileSync(
      VIEW_TOKEN_PATH,
      JSON.stringify({ profileId: LIVE_PROFILE_ID, viewToken }, null, 2)
    );
  } finally {
    await browser.close();
  }
}
