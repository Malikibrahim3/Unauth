import { Page, BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const CREDENTIALS_PATH = path.join(__dirname, '../.test-credentials.json')

interface TestCredentials {
  email: string
  password: string
  userId: string
  storeName: string
}

function getCredentials(): TestCredentials {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      'Test credentials not found. Run global setup first: npx playwright test --global-setup'
    )
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
}

export async function signIn(page: Page): Promise<void> {
  const credentials = getCredentials()

  await page.goto('/login')
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', credentials.email)
  await page.fill('input[type="password"]', credentials.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/onboarding', { timeout: 3000 })
    await page.locator('button[type="submit"]').click()
  } catch {}

  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

export async function signInAndSaveState(
  context: BrowserContext,
  statePath: string
): Promise<void> {
  const page = await context.newPage()
  await signIn(page)
  await context.storageState({ path: statePath })
  await page.close()
}

export async function uploadCSV(
  page: Page,
  fixture: 'standard' | 'rich' | 'minimal' | 'investigation',
  options?: {
    label?: string
    dateRangeStart?: string
    dateRangeEnd?: string
    uploadType?: 'standard' | 'historical' | 'investigation'
  }
): Promise<string> {
  const csvPath = path.join(__dirname, `csv-fixtures/${fixture}.csv`)

  if (!fs.existsSync(csvPath)) {
    const { generateCSV } = require('./generate-fixtures')
    generateCSV(fixture)
  }

  await page.goto('/upload')
  // File input is intentionally hidden; wait for it to be attached to the DOM
  await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 })
  await page.locator('input[type="file"]').setInputFiles(csvPath)

  // Wait for column mapping step — accept test-id, common heading text, or the
  // "We found N columns" message that the actual UI renders
  await page.waitForSelector(
    '[data-testid="column-mapping"], [data-testid="upload-context"], text=Column mapping, text=Upload context, text=We found',
    { timeout: 20000 }
  )

  const autoMap = page.locator('[data-testid="auto-map-button"]')
  if (await autoMap.isVisible({ timeout: 1000 })) {
    await autoMap.click()
    await page.waitForTimeout(500)
  }

  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")')
  if (await continueBtn.isVisible({ timeout: 1000 })) {
    await continueBtn.click()
  }

  if (options?.label) {
    const labelInput = page.locator('[data-testid="upload-label"]')
    if (await labelInput.isVisible({ timeout: 2000 })) await labelInput.fill(options.label)
  }

  if (options?.dateRangeStart) {
    const startInput = page.locator('[data-testid="date-range-start"]')
    if (await startInput.isVisible({ timeout: 2000 })) await startInput.fill(options.dateRangeStart)
  }

  if (options?.dateRangeEnd) {
    const endInput = page.locator('[data-testid="date-range-end"]')
    if (await endInput.isVisible({ timeout: 2000 })) await endInput.fill(options.dateRangeEnd)
  }

  if (options?.uploadType) {
    const typeSelector = page.locator(`[data-testid="upload-type-${options.uploadType}"]`)
    if (await typeSelector.isVisible({ timeout: 2000 })) await typeSelector.click()
  }

  await page.locator(
    'button:has-text("Upload"), button:has-text("Analyse"), button:has-text("Analyze"), button:has-text("Process"), [data-testid="submit-upload"]'
  ).click()

  await page.waitForSelector(
    '[data-testid="audit-results"], [data-status="completed"]',
    { timeout: 180000 }
  )

  const url = page.url()
  const runIdMatch = url.match(/\/audit\/([^/?]+)/)
  if (!runIdMatch) throw new Error(`Could not extract runId from URL: ${url}`)
  return runIdMatch[1]
}

export async function getFirstCustomerId(page: Page): Promise<string> {
  await page.goto('/customers')
  await page.waitForSelector('[data-testid="customer-row"]', { timeout: 15000 })

  const firstRow = page.locator('[data-testid="customer-row"]').first()
  const href = await firstRow.locator('a').first().getAttribute('href')
  if (!href) throw new Error('Could not find customer link in first row')

  const match = href.match(/\/customers\/([^/?]+)/)
  if (!match) throw new Error(`Could not extract customer ID from href: ${href}`)
  return match[1]
}

export async function openCustomerProfile(
  page: Page,
  customerId: string
): Promise<string> {
  await page.goto(`/customers/${customerId}`)
  await page.waitForSelector('[data-testid="customer-profile"]', { timeout: 15000 })
  return extractPageText(page)
}

export async function generateEvidencePackage(
  page: Page,
  customerId: string
): Promise<string> {
  await page.goto(`/customers/${customerId}/evidence/new`)
  await page.waitForSelector('[data-testid="disputed-order-select"], #order-select', { timeout: 10000 })
  await page.locator('[data-testid="disputed-order-select"], #order-select').selectOption({ index: 1 })
  await page.waitForSelector('[data-testid="ce3-eligibility"], text=CE3.0', { timeout: 8000 })
  await page.locator('button:has-text("Generate")').click()
  await page.waitForURL('**/chargebacks/**', { timeout: 30000 })

  const url = page.url()
  const match = url.match(/\/chargebacks\/([^/?]+)/)
  if (!match) throw new Error(`Could not extract package ID from URL: ${url}`)
  return match[1]
}

export async function extractPageText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement
    clone.querySelectorAll(
      'script, style, [aria-hidden="true"], [data-hidden="true"], .sr-only'
    ).forEach(el => el.remove())
    return clone.innerText.replace(/\s+/g, ' ').trim()
  })
}

export async function waitForProcessing(
  page: Page,
  timeout = 180000
): Promise<void> {
  await page.waitForSelector(
    '[data-testid="audit-results"], [data-status="completed"]',
    { timeout }
  )
}

export async function setInvestigationStatus(
  page: Page,
  customerId: string,
  status: 'new' | 'under_review' | 'contacted' | 'resolved' | 'cleared'
): Promise<void> {
  await page.goto(`/customers/${customerId}`)
  await page.waitForSelector('[data-testid="investigation-status"]', { timeout: 10000 })
  await page.locator('[data-testid="investigation-status"]').selectOption(status)
  await page.waitForResponse(
    res => res.url().includes('/api/customers') && res.status() === 200,
    { timeout: 5000 }
  )
}

export async function downloadFile(
  page: Page,
  triggerSelector: string,
  saveDir: string
): Promise<string> {
  const downloadPromise = page.waitForEvent('download')
  await page.locator(triggerSelector).click()
  const download = await downloadPromise
  const savePath = path.join(saveDir, download.suggestedFilename())
  await download.saveAs(savePath)
  return savePath
}

export { getCredentials }
