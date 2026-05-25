import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.join(__dirname, '..'));

const TEST = {
  email: `screenshot-capture-${Date.now()}@unauth-test-automation.com`,
  password: 'ScreenshotCap!2026#Secure',
  storeName: 'Elara & Co',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function cleanup(userId) {
  if (!userId) return;
  try { await supabase.from('merchants').delete().eq('user_id', userId); } catch {}
  try { await supabase.auth.admin.deleteUser(userId); } catch {}
}

(async () => {
  let userId;
  try {
    console.log('Creating test user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST.email,
      password: TEST.password,
      email_confirm: true,
      user_metadata: { is_test_account: true, created_by: 'screenshot-capture' },
    });
    if (error) throw error;
    userId = data.user.id;

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
    await page.fill('input[type="email"]', TEST.email);
    await page.fill('input[type="password"]', TEST.password);
    await page.click('button:has-text("SIGN IN"), button:has-text("Sign in")');
    await page.waitForURL(/\/(upload|dashboard|onboarding)/, { timeout: 30_000 });
    console.log('Signed in, landed at:', page.url());

    console.log('Navigating to /upload...');
    await page.goto('http://localhost:3000/upload', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Hide demo banner(s) and clean up sidebar email
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

      // Replace the test email in the sidebar with a clean placeholder to match the other screenshots
      document.querySelectorAll('body *').forEach((el) => {
        if (
          el.children.length === 0 &&
          el.textContent &&
          el.textContent.includes('screenshot-capture-')
        ) {
          el.textContent = 'demo@unauth.app';
        }
      });
    });

    await page.waitForTimeout(400);

    const outPath = path.join(__dirname, '..', 'public', 'screenshots', 'pipeline-upload-cohesive.png');
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved:', outPath);

    await browser.close();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up test user...');
    await cleanup(userId);
  }
})();
