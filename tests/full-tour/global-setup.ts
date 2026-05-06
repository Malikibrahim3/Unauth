/**
 * Full-tour global setup — creates a test account, seeds demo data,
 * and saves auth storage state so the main test can reuse it.
 */
import { chromium, type FullConfig } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const STORAGE_STATE_PATH = path.join(__dirname, '.full-tour-storage-state.json')
export const CREDENTIALS_PATH = path.join(__dirname, '.full-tour-credentials.json')

const TEST_MERCHANT = {
  email: `full-tour-${Date.now()}@unauth-test-automation.com`,
  password: 'FullTour!2026#Secure',
  storeName: 'Full Tour Merchant',
}

async function globalSetup(config: FullConfig) {
  loadEnvConfig(process.cwd())
  const baseURL = String(config.projects[0].use.baseURL ?? 'http://localhost:3000')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Clean up previous run
  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
      await supabase.auth.admin.deleteUser(prev.userId)
      console.log('[full-tour setup] Previous test account deleted')
    } catch { /* ignore */ }
  }

  // Create test account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_MERCHANT.email,
    password: TEST_MERCHANT.password,
    email_confirm: true,
    user_metadata: { is_test_account: true, created_by: 'full-tour-playwright' },
  })
  if (authError || !authData?.user) throw new Error(`Create user failed: ${authError?.message}`)
  const userId = authData.user.id
  console.log('[full-tour setup] Created test user:', userId)

  // Create merchant profile (setup_complete = true so no onboarding redirect)
  const { error: merchantError } = await supabase.from('merchants').upsert({
    user_id: userId,
    name: TEST_MERCHANT.storeName,
    monthly_order_volume: '500-2000',
    primary_fraud_concern: 'refund_abuse',
    setup_complete: true,
    created_at: new Date().toISOString(),
  })
  if (merchantError) throw new Error(`Create merchant failed: ${merchantError.message}`)

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({ email: TEST_MERCHANT.email, password: TEST_MERCHANT.password, userId }, null, 2))

  // Browser sign-in → save storage state
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[type="email"]', { timeout: 15_000 })
    await page.fill('input[type="email"]', TEST_MERCHANT.email)
    await page.fill('input[type="password"]', TEST_MERCHANT.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 30_000 })
    console.log('[full-tour setup] Signed in →', page.url())

    // Seed demo audit data
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      return { ok: res.ok, status: res.status }
    })
    console.log('[full-tour setup] Demo seed status:', result.status)

    await context.storageState({ path: STORAGE_STATE_PATH })
    console.log('[full-tour setup] Auth state saved to', STORAGE_STATE_PATH)
  } finally {
    await browser.close()
  }
}

export default globalSetup
