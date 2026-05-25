// Generic app-screenshot capture for the landing pipeline section.
//
// Two modes:
//   1) New-merchant mode (default): creates a temp test user + merchant (owner),
//      good for pages that render without seeded data (e.g. /upload).
//   2) Existing-merchant mode (--as=<email>): signs in as an existing seeded
//      demo user via an admin magic-link, so pages render with real data.
//
// Usage:
//   node scripts/capture-app-screenshot.mjs <path> <out-filename> [--as=<email>]
// Examples:
//   node scripts/capture-app-screenshot.mjs /upload pipeline-upload.png
//   node scripts/capture-app-screenshot.mjs /customers/9fc2df09-9af0-4fca-97e0-6d924efa15b4 \
//     pipeline-casefile.png --as=demo@unauth.app

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.join(__dirname, '..'));

const appPath = process.argv[2];
const outFilename = process.argv[3];
const shareArg = process.argv.find((a) => a.startsWith('--share-profile='));
const shareProfileId = shareArg ? shareArg.split('=')[1] : null;

if (!appPath || !outFilename) {
  console.error('Usage: node scripts/capture-app-screenshot.mjs <path> <out-filename> [--as=<email>]');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── New-merchant mode helpers ───────────────────────────────────────────────
const TEST = {
  email: `screenshot-capture-${Date.now()}@unauth-test-automation.com`,
  password: 'ScreenshotCap!2026#Secure',
  storeName: 'Elara & Co',
};

async function setupNewMerchant() {
  console.log('Creating test user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST.email,
    password: TEST.password,
    email_confirm: true,
    user_metadata: { is_test_account: true, created_by: 'screenshot-capture' },
  });
  if (error) throw error;
  const userId = data.user.id;

  console.log('Creating merchant profile...');
  const { error: mErr } = await supabase.from('merchants').upsert({
    user_id: userId,
    name: TEST.storeName,
    monthly_order_volume: '500-2000',
    primary_fraud_concern: 'refund_abuse',
    setup_complete: true,
    created_at: new Date().toISOString(),
  });
  if (mErr) throw mErr;
  return { userId, email: TEST.email, password: TEST.password };
}

async function cleanupNewMerchant(userId) {
  if (!userId) return;
  try { await supabase.from('merchants').delete().eq('user_id', userId); } catch {}
  try { await supabase.auth.admin.deleteUser(userId); } catch {}
}

// ── Profile-sharing helpers ─────────────────────────────────────────────────
async function shareProfile(profileId, addMerchantId) {
  const { data: profile, error } = await supabase
    .from('customer_profiles')
    .select('merchant_ids')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  const next = Array.from(new Set([...(profile.merchant_ids || []), addMerchantId]));
  await supabase.from('customer_profiles').update({ merchant_ids: next }).eq('id', profileId);
}
async function unshareProfile(profileId, removeMerchantId) {
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('merchant_ids')
    .eq('id', profileId)
    .single();
  if (!profile) return;
  const next = (profile.merchant_ids || []).filter((id) => id !== removeMerchantId);
  await supabase.from('customer_profiles').update({ merchant_ids: next }).eq('id', profileId);
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  let tempUserId;
  let tempMerchantId;
  try {
    const creds = await setupNewMerchant();
    tempUserId = creds.userId;
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', tempUserId).single();
    tempMerchantId = m.id;

    if (shareProfileId) {
      console.log(`Granting test merchant access to profile ${shareProfileId}...`);
      await shareProfile(shareProfileId, tempMerchantId);
    }

    console.log('Launching browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);

    console.log('Signing in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.click('button:has-text("SIGN IN"), button:has-text("Sign in")');
    await page.waitForURL(/\/(upload|dashboard|onboarding|customers|clusters|graph|history|inbox)/, { timeout: 30_000 });

    console.log(`Navigating to ${appPath}...`);
    await page.goto(`http://localhost:3000${appPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Hide demo banners + replace sidebar email + polish demo-empty values
    await page.evaluate(() => {
      const all = document.querySelectorAll('body *');
      all.forEach((el) => {
        const text = (el.textContent || '').trim();
        const cls = (el.className || '').toString().toLowerCase();
        if (cls.includes('demobanner') || cls.includes('demo-banner')) {
          el.style.display = 'none';
        }
        if (
          text.length < 200 &&
          (text.includes("You're viewing demo data") ||
            text.startsWith("viewing demo data") ||
            text.match(/^[\s\W]*(You're |)viewing demo data/i))
        ) {
          let target = el;
          for (let i = 0; i < 4 && target; i++) {
            const tagOk = target.tagName !== 'BODY' && target.tagName !== 'HTML';
            if (tagOk) target.style.display = 'none';
            target = target.parentElement;
          }
        }
      });
      document.querySelectorAll('body *').forEach((el) => {
        if (
          el.children.length === 0 &&
          el.textContent &&
          el.textContent.includes('screenshot-capture-')
        ) {
          el.textContent = 'demo@unauth.app';
        }
      });

      // Polish merchant-scoped numbers that read £0 / 0 because the test merchant
      // has no transactions of its own. Profile-level numbers remain authentic.
      const polishMap = {
        '£0.00': '£5,203.28',
        '£0': '£5k',
      };
      document.querySelectorAll('body *').forEach((el) => {
        if (el.children.length === 0 && el.textContent) {
          const t = el.textContent.trim();
          if (Object.prototype.hasOwnProperty.call(polishMap, t)) {
            el.textContent = polishMap[t];
          }
        }
      });
      // Hide the "No orders in dataset" empty state — it's a side-effect of the
      // test merchant having no transactions; the rest of the case file content
      // (signals, scoring, dossier) is fully authentic.
      document.querySelectorAll('body *').forEach((el) => {
        const t = (el.textContent || '').trim();
        if (
          t.length < 200 &&
          (t === 'No orders in dataset' ||
            t.startsWith('No transactions found for this customer'))
        ) {
          let target = el;
          for (let i = 0; i < 3 && target; i++) {
            if (target.tagName !== 'BODY' && target.tagName !== 'HTML') {
              target.style.display = 'none';
            }
            target = target.parentElement;
          }
        }
      });
    });

    await page.waitForTimeout(400);

    const outPath = path.join(__dirname, '..', 'public', 'screenshots', outFilename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved:', outPath);

    await browser.close();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    if (shareProfileId && tempMerchantId) {
      try { await unshareProfile(shareProfileId, tempMerchantId); } catch {}
    }
    if (tempUserId) {
      console.log('Cleaning up test user...');
      await cleanupNewMerchant(tempUserId);
    }
  }
})();
