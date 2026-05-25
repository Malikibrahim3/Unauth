// Capture the case file screenshot signed in as demo@unauth.app (Elara & Co Apparel)
// Temporarily sets a known password, signs in via the UI, captures, then clears it.

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.join(__dirname, '..'));

const DEMO_USER_ID = 'c1361d17-0797-459e-baa9-234936b2976d';
const DEMO_EMAIL   = 'demo@unauth.app';
const TEMP_PASS    = 'TempCapture!2026#Sc';
const PROFILE_ID   = '9fc2df09-9af0-4fca-97e0-6d924efa15b4'; // Nora Kessler
const OUT_FILE     = 'pipeline-casefile-v3.png';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

(async () => {
  try {
    // Set a known temporary password
    console.log('Setting temp password for demo@unauth.app...');
    const { error: pwErr } = await supabase.auth.admin.updateUserById(DEMO_USER_ID, {
      password: TEMP_PASS,
    });
    if (pwErr) throw pwErr;

    console.log('Launching browser...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);

    console.log('Signing in as demo@unauth.app...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { state: 'visible' });
    await page.fill('input[type="email"]', DEMO_EMAIL);
    await page.fill('input[type="password"]', TEMP_PASS);
    await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10_000 }).catch(() => {});
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(upload|dashboard|onboarding|customers|clusters|graph|history|inbox)/, { timeout: 30_000 });
    console.log('Signed in, at:', page.url());

    console.log(`Navigating to /customers/${PROFILE_ID} ...`);
    await page.goto(`http://localhost:3000/customers/${PROFILE_ID}`, { waitUntil: 'networkidle' });

    const landed = page.url();
    console.log('Landed at:', landed);

    // Wait for full render — data, charts, roadmap
    await page.waitForTimeout(4000);

    // Polish: hide the DemoBanner — target by its specific inline style (risk-high-bg)
    await page.evaluate(() => {
      // DemoBanner has style="background: var(--risk-high-bg); ..."
      const banner = document.querySelector('[style*="risk-high-bg"]');
      if (banner) banner.style.display = 'none';
    });

    await page.waitForTimeout(400);

    const outPath = path.join(__dirname, '..', 'public', 'screenshots', OUT_FILE);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('✓ Saved:', outPath);

    await browser.close();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    // Invalidate the temp password by setting a new random one
    console.log('Resetting demo account password to random...');
    const { randomUUID } = await import('crypto');
    await supabase.auth.admin.updateUserById(DEMO_USER_ID, {
      password: `${randomUUID()}!Aa9`,
    }).catch(() => {});
    console.log('Done.');
  }
})();
