import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const REPORT_DIR = path.join(process.cwd(), 'reports/ux-audit')
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots')
const DOWNLOAD_DIR = path.join(REPORT_DIR, 'downloads')
const CREDENTIALS_PATH = path.join(__dirname, '.ux-audit-credentials.json')

type ClickRecord = {
  page: string
  label: string
  kind: string
  before: string
  after: string
  outcome: string
  patternRecommendation?: 'page' | 'modal' | 'drawer' | 'inline' | 'remove'
}

type InventoryItem = {
  page: string
  tag: string
  role: string | null
  label: string
  href: string | null
  disabled: boolean
}

const evidence: {
  generatedAt: string
  routes: string[]
  pagesVisited: Array<{ name: string; url: string; screenshot: string }>
  clicks: ClickRecord[]
  inventories: InventoryItem[]
  limitations: string[]
  flowOutcome: { uploadedRunUrl?: string; runId?: string; uploadCompleted: boolean }
} = {
  generatedAt: new Date().toISOString(),
  routes: [],
  pagesVisited: [],
  clicks: [],
  inventories: [],
  limitations: [],
  flowOutcome: { uploadCompleted: false },
}

test.describe('Playwright UX audit', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    evidence.routes = discoverRoutes()
  })

  test.afterAll(() => {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(path.join(REPORT_DIR, 'ux-audit-evidence.json'), JSON.stringify(evidence, null, 2))
  })

  test('full merchant audit journey', async ({ page }) => {
    // Auth is handled via storageState from global-setup – go straight to dashboard
    await visitAndCapture(page, 'dashboard', '/dashboard')
    await visitAndCapture(page, 'upload-idle', '/upload')

    await recordClick(page, 'upload-idle', 'How do I export this from your platform?', async () => {
      await page.getByRole('button', { name: /How do I export/i }).click()
    }, 'inline')
    await screenshot(page, 'upload-export-guide-collapsed')

    await recordDownload(page, 'upload-idle', 'Download template')

    const invalidPath = path.join(REPORT_DIR, 'invalid-upload.txt')
    fs.writeFileSync(invalidPath, 'this is not a useful merchant csv\n')
    await page.locator('input[type="file"]').setInputFiles(invalidPath)
    await page.waitForTimeout(800)
    await screenshot(page, 'upload-invalid-file-selected')
    await inventory(page, 'upload-invalid-file-selected')

    await recordClick(page, 'upload-invalid-file-selected', 'Cancel', async () => {
      await page.getByRole('button', { name: /^Cancel$/ }).click()
    }, 'inline')

    const csvPath = path.join(process.cwd(), 'tests/utils/csv-fixtures/standard.csv')
    await page.locator('input[type="file"]').setInputFiles(csvPath)
    await expect(page.locator('[data-testid="column-mapping"]').first()).toBeVisible({ timeout: 20_000 })
    await screenshot(page, 'upload-column-mapping')
    await inventory(page, 'upload-column-mapping')

    await recordClick(page, 'upload-column-mapping', 'Continue', async () => {
      await page.getByRole('button', { name: /Continue/i }).click()
      await page.waitForSelector('[data-testid="upload-context"]', { timeout: 10_000 })
    }, 'inline')
    await screenshot(page, 'upload-context')
    await inventory(page, 'upload-context')

    await page.locator('[data-testid="upload-label"]').fill(`UX audit run ${Date.now()}`)
    await page.locator('[data-testid="date-range-start"]').fill('2026-01-01')
    await page.locator('[data-testid="date-range-end"]').fill('2026-03-31')

    await recordClick(page, 'upload-context', 'Historical import', async () => {
      await page.getByLabel(/Historical import/i).click()
    }, 'inline')
    await recordClick(page, 'upload-context', 'Customer investigation', async () => {
      await page.getByLabel(/Customer investigation/i).click()
    }, 'inline')
    await recordClick(page, 'upload-context', 'Regular upload', async () => {
      await page.getByLabel(/Regular upload/i).click()
    }, 'inline')

    await recordClick(page, 'upload-context', 'Back', async () => {
      await page.getByRole('button', { name: /Back/i }).click()
      await page.waitForSelector('[data-testid="column-mapping"]')
    }, 'inline')
    await screenshot(page, 'upload-back-to-mapping')

    await page.getByRole('button', { name: /Continue/i }).click()
    await page.waitForSelector('[data-testid="upload-context"]')
    await page.locator('[data-testid="upload-label"]').fill(`UX audit run ${Date.now()}`)

    const beforeUploadUrl = page.url()
    await page.getByRole('button', { name: /Upload and run audit|Run limited analysis/i }).click()
    await page.waitForTimeout(600)
    await screenshot(page, 'upload-processing')
    evidence.clicks.push({
      page: 'upload-context',
      label: 'Upload and run audit',
      kind: 'button',
      before: beforeUploadUrl,
      after: page.url(),
      outcome: 'Starts upload/processing state, then should route to audit results when complete.',
      patternRecommendation: 'page',
    })

    try {
      await page.waitForURL(/\/audit\/[^/]+$/, { timeout: 45_000, waitUntil: 'commit' })
      await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => undefined)
      evidence.flowOutcome.uploadCompleted = true
      evidence.flowOutcome.uploadedRunUrl = page.url()
      evidence.flowOutcome.runId = page.url().match(/\/audit\/([^/?#]+)/)?.[1]
    } catch (err) {
      evidence.limitations.push(`Upload processing did not reach results within timeout: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (!evidence.flowOutcome.uploadCompleted) {
      await page.goto('/history')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
      await screenshot(page, 'history-fallback-after-upload-timeout')
      const completedAuditLink = page.getByRole('link', { name: /View/i }).first()
      if (await completedAuditLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const href = await completedAuditLink.getAttribute('href')
        await recordClick(page, 'history-fallback-after-upload-timeout', 'View completed audit fallback', async () => {
          await completedAuditLink.click()
          await page.waitForTimeout(1000)
        }, 'page')
        if (!/\/audit\/[^/]+$/.test(page.url()) && href) {
          await gotoWithFontManifestRepair(page, href)
        }
        evidence.flowOutcome.uploadedRunUrl = page.url()
        evidence.flowOutcome.runId = page.url().match(/\/audit\/([^/?#]+)/)?.[1]
      } else {
        evidence.limitations.push('No completed audit was available after upload timeout, so results/drill-down could not be audited.')
        return
      }
    }

    await screenshot(page, 'audit-results-overview')
    await inventory(page, 'audit-results-overview')

    await recordDownload(page, 'audit-results-overview', 'Export CSV')

    await recordClick(page, 'audit-results-overview', 'Customers tab', async () => {
      await page.getByRole('tab', { name: /Customers/i }).click()
    }, 'inline')
    await screenshot(page, 'audit-results-customers-tab')
    await inventory(page, 'audit-results-customers-tab')

    const firstView = page.getByRole('button', { name: /View/i }).first()
    if (await firstView.isVisible({ timeout: 3000 }).catch(() => false)) {
      await recordClick(page, 'audit-results-customers-tab', 'View customer', async () => {
        await firstView.click()
        await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
      }, 'drawer')
      await screenshot(page, 'audit-customer-drawer')
      await inventory(page, 'audit-customer-drawer')
      await recordClick(page, 'audit-customer-drawer', 'Close panel', async () => {
        const closeBtn = page.getByRole('button', { name: /Close panel|Close profile|Close/i }).first()
        if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeBtn.click()
          await page.waitForTimeout(500)
        }
      }, 'drawer')
    } else {
      evidence.limitations.push('No customer View button was visible on the results page.')
    }

    await recordClick(page, 'audit-results-customers-tab', 'Transactions tab', async () => {
      await page.getByRole('tab', { name: /Transactions/i }).click()
    }, 'inline')
    await screenshot(page, 'audit-results-transactions-tab')
    await inventory(page, 'audit-results-transactions-tab')

    await recordClick(page, 'audit-results-transactions-tab', 'Data quality tab', async () => {
      await page.getByRole('tab', { name: /Data quality/i }).click()
    }, 'inline')
    await screenshot(page, 'audit-results-data-quality-tab')

    await recordClick(page, 'audit-results-data-quality-tab', 'Risk Overview breadcrumb', async () => {
      await page.getByRole('link', { name: /Risk Overview/i }).click()
      await page.waitForURL('**/dashboard', { timeout: 30_000, waitUntil: 'commit' }).catch(async () => {
        await gotoWithFontManifestRepair(page, '/dashboard')
      })
    }, 'page')
    await screenshot(page, 'return-dashboard')

    const routes = ['/dashboard', '/history', '/customers', '/watchlist', '/inbox', '/chargebacks', '/settings', '/help']
    for (const route of routes) {
      await visitAndCapture(page, route.slice(1) || 'root', route)
    }
  })
})

async function signIn(_page: Page) {
  // Auth state is loaded via storageState in playwright.config.ts (set during global-setup).
  // This function is kept for reference but tests no longer need to call the login UI.
  void _page
}

async function visitAndCapture(page: Page, name: string, route: string) {
  try {
    await gotoWithFontManifestRepair(page, route)
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  } catch (err) {
    evidence.limitations.push(`[${name}] Navigation to ${route} failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  await screenshot(page, name)
  await inventory(page, name)
}

async function gotoWithFontManifestRepair(page: Page, route: string) {
  repairNextFontManifest()
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  } catch (err) {
    repairNextFontManifest()
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  }
}

function repairNextFontManifest() {
  const serverDir = path.join(process.cwd(), '.next/server')
  if (!fs.existsSync(serverDir)) return
  const json = JSON.stringify({
    pages: {},
    app: {},
    appUsingSizeAdjust: false,
    pagesUsingSizeAdjust: false,
  })
  fs.writeFileSync(path.join(serverDir, 'next-font-manifest.json'), json)
  fs.writeFileSync(path.join(serverDir, 'next-font-manifest.js'), `self.__NEXT_FONT_MANIFEST=${JSON.stringify(json)}`)
}

async function screenshot(page: Page, name: string) {
  const fileName = `${name}.png`
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true })
  evidence.pagesVisited.push({ name, url: page.url(), screenshot: `screenshots/${fileName}` })
}

async function inventory(page: Page, pageName: string) {
  const items = await page.evaluate((name) => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    return Array.from(document.querySelectorAll('a, button, select, input, [role="button"], [role="tab"]'))
      .filter(visible)
      .map((el) => ({
        page: name,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        label:
          el.getAttribute('aria-label') ||
          (el as HTMLInputElement).value ||
          (el.textContent || '').replace(/\s+/g, ' ').trim() ||
          el.getAttribute('href') ||
          el.getAttribute('name') ||
          'unlabelled',
        href: el instanceof HTMLAnchorElement ? el.href : null,
        disabled: Boolean((el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled),
      }))
  }, pageName)
  evidence.inventories.push(...items)
}

async function recordClick(
  page: Page,
  pageName: string,
  label: string,
  action: () => Promise<void>,
  patternRecommendation: ClickRecord['patternRecommendation'],
) {
  const before = page.url()
  try {
    await action()
    await page.waitForTimeout(400)
  } catch (err) {
    evidence.limitations.push(`[${pageName}] Click on "${label}" failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  const after = page.url()
  evidence.clicks.push({
    page: pageName,
    label,
    kind: 'click',
    before,
    after,
    outcome: before === after ? 'State changed in place.' : `Navigated to ${after}`,
    patternRecommendation,
  })
}

async function recordDownload(page: Page, pageName: string, label: string) {
  const before = page.url()
  const btn = page.getByText(label, { exact: false })
  const visible = await btn.isVisible({ timeout: 5_000 }).catch(() => false)
  if (!visible) {
    evidence.limitations.push(`[${pageName}] "${label}" button not visible – skipped download recording.`)
    evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: 'Button not visible – skipped.', patternRecommendation: 'inline' })
    return
  }
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 12_000 })
    await btn.click()
    const download = await downloadPromise
    const savePath = path.join(DOWNLOAD_DIR, download.suggestedFilename())
    await download.saveAs(savePath)
    evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: `Downloaded ${download.suggestedFilename()}`, patternRecommendation: 'inline' })
  } catch (err) {
    evidence.limitations.push(`[${pageName}] "${label}" did not trigger a file download within 12 s: ${err instanceof Error ? err.message : String(err)}`)
    evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: 'No download event fired – likely opens a modal or inline state instead.', patternRecommendation: 'inline' })
  }
}

function discoverRoutes() {
  const appDir = path.join(process.cwd(), 'app')
  const routes: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (entry.name !== 'page.tsx') continue
      const rel = path.relative(appDir, path.dirname(fullPath))
      const route =
        '/' +
        rel
          .split(path.sep)
          .filter((part) => !part.startsWith('('))
          .map((part) => (part.startsWith('[') ? `:${part.slice(1, -1)}` : part))
          .join('/')
      routes.push(route === '/' ? '/' : route.replace(/\/+/g, '/'))
    }
  }
  walk(appDir)
  return Array.from(new Set(routes)).sort()
}
