import { chromium, type FullConfig, type Page } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const CREDENTIALS_PATH = path.join(__dirname, '.ux-audit-credentials.json')
export const STORAGE_STATE_PATH = path.join(__dirname, '.ux-audit-storage-state.json')

const TEST_MERCHANT = {
  email: `ux-audit-${Date.now()}@unauth-test-automation.com`,
  password: 'UxAudit!2026#Secure',
  storeName: 'UX Audit Merchant',
  monthlyVolume: '500-2000',
  primaryConcern: 'refund_abuse',
}

async function globalSetup(config: FullConfig) {
  loadEnvConfig(process.cwd())
  process.env.PLAYWRIGHT = '1'
  const baseURL = String(config.projects[0].use.baseURL ?? 'http://localhost:3000')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Clean up previous test account if it exists
  if (fs.existsSync(CREDENTIALS_PATH)) {
    const existing = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
    await cleanupTestAccount(supabase, existing.userId)
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_MERCHANT.email,
    password: TEST_MERCHANT.password,
    email_confirm: true,
    user_metadata: { is_test_account: true, created_by: 'ux-audit-playwright' },
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create UX audit account: ${authError?.message}`)
  }

  const userId = authData.user.id

  const { error: merchantError } = await supabase
    .from('merchants')
    .upsert({
      user_id: userId,
      name: TEST_MERCHANT.storeName,
      monthly_order_volume: TEST_MERCHANT.monthlyVolume,
      primary_fraud_concern: TEST_MERCHANT.primaryConcern,
      setup_complete: true,
      created_at: new Date().toISOString(),
    })

  if (merchantError) {
    throw new Error(`Failed to create UX audit merchant profile: ${merchantError.message}`)
  }

  fs.writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify({ email: TEST_MERCHANT.email, password: TEST_MERCHANT.password, userId, storeName: TEST_MERCHANT.storeName }, null, 2),
  )

  // Sign in via browser and save storage state for test reuse
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  try {
    await signIn(page, baseURL, TEST_MERCHANT.email, TEST_MERCHANT.password)
    await seedDemoAudit(page)
    await context.storageState({ path: STORAGE_STATE_PATH })
    console.log('[UX audit setup] Auth storage state saved to', STORAGE_STATE_PATH)
  } finally {
    await browser.close()
  }
}

async function signIn(page: Page, baseURL: string, email: string, password: string) {
  await page.goto(`${baseURL}/login`)
  await page.waitForSelector('input[type="email"]', { timeout: 15_000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
  console.log('[UX audit setup] Signed in, now at:', page.url())
}

async function seedDemoAudit(page: Page) {
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  })

  if (!result.ok && result.status !== 409) {
    console.warn(`[UX audit setup] Demo seed returned ${result.status}: ${result.text}`)
  } else {
    console.log('[UX audit setup] Demo audit seeded, status:', result.status)
  }
}

async function cleanupTestAccount(supabase: ReturnType<typeof createClient>, userId: string) {
  try {
    await supabase.auth.admin.deleteUser(userId)
  } catch (err) {
    console.warn('[UX audit setup] Could not clean up previous test account:', err)
  }
}

export default globalSetup
