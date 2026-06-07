import './load-env-local';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { TABLES } from '../../lib/supabase/tables';
import { hashSignedToken, makeSignedToken } from '../../lib/api/signedAccess';
import { loadEnvLocal } from './load-env-local';
import {
  AUTH_DIR,
  CREDENTIALS_PATH,
  VIEW_TOKEN_PATH,
  cleanupLightAuthData,
  readLightAuthState,
  removeLightAuthFiles,
  type LightAuthState,
} from './light-auth-state';

const TEST_PREFIX = 'E2E_UNAUTH_TEST_SUPPORT_UI';
const TEST_PASSWORD = 'PlaywrightTest!2026#Secure';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export default async function lightAuthSetup(config: FullConfig): Promise<void> {
  loadEnvLocal();
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';

  const supabase = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const existing = readLightAuthState();
  if (existing) {
    await cleanupLightAuthData(supabase, existing);
    removeLightAuthFiles();
  }

  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${TEST_PREFIX.toLowerCase()}-${runId}@unauth-test-automation.com`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { is_test_account: true, created_by: TEST_PREFIX, run_id: runId },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  const { data: merchantRow, error: merchantError } = await supabase.from(TABLES.MERCHANTS).insert({
    user_id: authData.user.id,
    name: `${TEST_PREFIX} Store ${runId}`,
    monthly_order_volume: '500-2000',
    primary_fraud_concern: 'refund_abuse',
    setup_complete: true,
    is_demo: true,
    is_internal: true,
    created_at: new Date().toISOString(),
  }).select('id').single();

  if (merchantError || !merchantRow) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create test merchant: ${merchantError?.message}`);
  }

  const now = new Date().toISOString();
  const profileEmail = `${TEST_PREFIX.toLowerCase()}-shopper-${runId}@example.com`;
  const { data: profileRow, error: profileError } = await supabase.from(TABLES.CUSTOMER_PROFILES).insert({
    merchant_ids: [merchantRow.id],
    names: [`${TEST_PREFIX} Shopper ${runId}`],
    emails: [profileEmail],
    primary_email: profileEmail,
    addresses: [`${TEST_PREFIX} Test Address ${runId}`],
    card_last4s: [],
    phones: [],
    ips: [],
    fraud_flags: [],
    refund_timestamps: [],
    identity_signals_summary: [],
    investigation_status: 'new',
    identity_confidence_grade: 'definite',
    first_seen: now,
    last_seen: now,
    risk_level: 'low',
    risk_score: 0,
    profile_confidence: 100,
    refund_rate: 0,
    refund_acceleration_score: 0,
    total_orders: 0,
    total_refund_claims: 0,
    total_chargebacks: 0,
    total_merchants_seen_at: 1,
    manually_reviewed: false,
    on_watchlist: false,
    false_positive_reported: false,
  }).select('id').single();

  if (profileError || !profileRow) {
    await supabase.from(TABLES.MERCHANTS).delete().eq('id', merchantRow.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create test customer profile: ${profileError?.message}`);
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const viewToken = makeSignedToken({
    profile_id: profileRow.id,
    merchant_id: merchantRow.id,
    expires_at: expiresAt,
  });
  const tokenHash = hashSignedToken(viewToken);

  const { error: tokenError } = await supabase.from(TABLES.PROFILE_VIEW_TOKENS).insert({
    profile_id: profileRow.id,
    merchant_id: merchantRow.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (tokenError) {
    await supabase.from(TABLES.CUSTOMER_PROFILES).delete().eq('id', profileRow.id);
    await supabase.from(TABLES.MERCHANTS).delete().eq('id', merchantRow.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create test profile view token: ${tokenError.message}`);
  }

  const state: LightAuthState = {
    email,
    userId: authData.user.id,
    merchantId: merchantRow.id,
    profileId: profileRow.id,
    tokenHash,
    runId,
  };
  fs.writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify(state, null, 2)
  );
  fs.writeFileSync(
    VIEW_TOKEN_PATH,
    JSON.stringify({ profileId: profileRow.id, viewToken }, null, 2)
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('#login-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|upload|claims|customers|onboarding)/, { timeout: 60000 });
    await page.context().storageState({ path: path.join(AUTH_DIR, 'user.json') });
  } finally {
    await browser.close();
  }
}
