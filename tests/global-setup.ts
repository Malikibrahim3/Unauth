import { chromium, FullConfig, Page, Response } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const TEST_MERCHANT = {
  email: `playwright-test-${Date.now()}@unauth-test-automation.com`,
  password: 'PlaywrightTest!2026#Secure',
  storeName: 'Playwright Test Store',
  monthlyVolume: '500-2000',
  primaryConcern: 'refund_abuse'
}

const CREDENTIALS_PATH = path.join(__dirname, '.test-credentials.json')

async function globalSetup(config: FullConfig) {
  process.env.PLAYWRIGHT = '1'
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000'

  if (!baseURL || baseURL === '***') {
    throw new Error('PLAYWRIGHT_BASE_URL is not set or invalid. Please configure this secret in GitHub Actions.')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  if (fs.existsSync(CREDENTIALS_PATH)) {
    const existing = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
    await cleanupTestAccount(supabase, existing.userId)
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_MERCHANT.email,
    password: TEST_MERCHANT.password,
    email_confirm: true,
    user_metadata: {
      is_test_account: true,
      created_by: 'playwright'
    }
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test merchant account: ${authError?.message}`)
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
      created_at: new Date().toISOString()
    })

  if (merchantError) {
    throw new Error(`Failed to create merchant profile: ${merchantError.message}`)
  }

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({
    email: TEST_MERCHANT.email,
    password: TEST_MERCHANT.password,
    userId,
    storeName: TEST_MERCHANT.storeName
  }, null, 2))

  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
    
    // Debug: log page content to see what's actually there
    const pageContent = await page.content()
    console.log('[Playwright Setup] Login page HTML length:', pageContent.length)
    console.log('[Playwright Setup] Page URL:', page.url())
    
    // Try multiple selectors
    const selectors = ['#email', 'input[type="email"]', 'input[name="email"]']
    let foundSelector = null
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 })
        foundSelector = selector
        console.log('[Playwright Setup] Found selector:', selector)
        break
      } catch {
        console.log('[Playwright Setup] Selector not found:', selector)
      }
    }
    
    if (!foundSelector) {
      console.log('[Playwright Setup] No email input found, dumping page content')
      console.log(pageContent.substring(0, 1000))
      throw new Error('Email input not found on login page')
    }
    
    await page.fill(foundSelector, TEST_MERCHANT.email)
    await page.fill('#password', TEST_MERCHANT.password)
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL('**/onboarding', { timeout: 5000 })
      await completeOnboarding(page)
    } catch {}

    await page.waitForURL('**/dashboard', { timeout: 15000 })

    try {
      const demoButton = page.locator('[data-testid="load-demo-button"]')
      if (await demoButton.isVisible({ timeout: 3000 })) {
        await demoButton.click()
        await page.waitForResponse(
          (res: Response) => res.url().includes('/api/demo') && res.status() === 200,
          { timeout: 30000 }
        )
      }
    } catch {}

    await uploadSeedCSV(page, baseURL)
    await uploadSeedCSV(page, baseURL, 'rich')
    await generateSeedEvidence(page, baseURL)
  } finally {
    await browser.close()
  }
}

async function completeOnboarding(page: Page) {
  const storeNameInput = page.locator('[data-testid="store-name"], input[name="storeName"]')
  if (await storeNameInput.isVisible({ timeout: 2000 })) {
    await storeNameInput.fill('Playwright Test Store')
  }

  const volumeSelect = page.locator('[data-testid="monthly-volume"], select[name="monthlyVolume"]')
  if (await volumeSelect.isVisible({ timeout: 2000 })) {
    await volumeSelect.selectOption({ index: 2 })
  }

  const concernSelect = page.locator('[data-testid="primary-concern"], select[name="primaryConcern"]')
  if (await concernSelect.isVisible({ timeout: 2000 })) {
    await concernSelect.selectOption({ index: 0 })
  }

  const submitButton = page.locator('button[type="submit"], [data-testid="onboarding-submit"]')
  if (await submitButton.isVisible({ timeout: 2000 })) {
    await submitButton.click()
    await page.waitForURL('**/upload', { timeout: 10000 })
  }
}

async function uploadSeedCSV(
  page: Page,
  baseURL: string,
  fixture: 'standard' | 'rich' | 'minimal' | 'investigation' = 'standard'
) {
  const csvPath = path.join(__dirname, `utils/csv-fixtures/${fixture}.csv`)

  if (!fs.existsSync(csvPath)) {
    const { generateCSV } = require('./utils/generate-fixtures')
    generateCSV(fixture)
  }

  await page.goto(`${baseURL}/upload`)
  await page.waitForSelector('input[type="file"]', { timeout: 10000 })
  await page.locator('input[type="file"]').setInputFiles(csvPath)

  await page.waitForSelector(
    '[data-testid="column-mapping"], [data-testid="upload-context"], text=Column mapping, text=Upload context',
    { timeout: 20000 }
  )

  const autoMapButton = page.locator('[data-testid="auto-map-button"], button:has-text("Auto-map")')
  if (await autoMapButton.isVisible({ timeout: 2000 })) {
    await autoMapButton.click()
  }

  const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")')
  if (await continueButton.isVisible({ timeout: 2000 })) {
    await continueButton.click()
  }

  const labelInput = page.locator('[data-testid="upload-label"]')
  if (await labelInput.isVisible({ timeout: 3000 })) {
    await labelInput.fill(`Playwright ${fixture} seed - ${new Date().toISOString().split('T')[0]}`)
  }

  await page.locator(
    'button:has-text("Upload"), button:has-text("Analyse"), button:has-text("Analyze"), button:has-text("Process"), [data-testid="submit-upload"]'
  ).click()

  await page.waitForSelector(
    '[data-testid="audit-results"], [data-status="completed"]',
    { timeout: 180000 }
  )
}

async function generateSeedEvidence(page: Page, baseURL: string) {
  await page.goto(`${baseURL}/customers`)
  await page.waitForSelector('[data-testid="customer-row"]', { timeout: 15000 })
  await page.locator('[data-testid="customer-row"]').first().click()
  await page.waitForSelector('[data-testid="customer-profile"], [data-testid="customer-drawer"]', { timeout: 10000 })

  const evidenceLink = page.locator('a:has-text("Generate evidence"), [data-testid="generate-evidence-link"]')
  if (await evidenceLink.isVisible({ timeout: 5000 })) {
    await evidenceLink.click()
    await page.waitForURL('**/evidence/new', { timeout: 10000 })
    await page.locator('[data-testid="disputed-order-select"], select[name="disputedOrderId"], #order-select').selectOption({ index: 1 })
    await page.waitForTimeout(1500)
    await page.locator('button:has-text("Generate")').click()
    await page.waitForURL('**/chargebacks/**', { timeout: 30000 })
  }
}

async function cleanupTestAccount(supabase: any, userId: string) {
  try {
    await supabase.auth.admin.deleteUser(userId)
  } catch (err) {
    console.warn('[Setup] Could not clean up previous test account:', err)
  }
}

export default globalSetup
