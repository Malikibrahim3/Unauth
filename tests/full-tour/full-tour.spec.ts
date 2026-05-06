/**
 * Full App Tour — Playwright
 *
 * Visits every major page, clicks every visible button,
 * and captures a screenshot after each action.
 *
 * Run with:
 *   npx playwright test --config=tests/full-tour/playwright.config.ts
 *
 * Pre-requisite: run the ux-audit global-setup first to generate the auth
 * storage state, OR run the ux-audit suite once so the file exists.
 *   npx playwright test --config=tests/ux-audit/playwright.config.ts --project=ux-desktop
 *
 * Screenshots land in:  tests/full-tour/screenshots/
 */

import { test, expect, type Page, type Locator } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ── constants ────────────────────────────────────────────────────────────────
const SS_DIR = path.join(process.cwd(), 'tests/full-tour/screenshots')
let ssIndex = 0

// ── helpers ──────────────────────────────────────────────────────────────────

/** Slugify a string so it can be used as a filename */
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Save a screenshot with an incrementing prefix so they stay in visit order */
async function shot(page: Page, label: string) {
  ssIndex++
  const name = `${String(ssIndex).padStart(3, '0')}-${slug(label)}.png`
  const filePath = path.join(SS_DIR, name)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`  📸  ${name}`)
  return filePath
}

/**
 * Navigate and wait for the page to settle.
 * Returns false if the page redirected away (e.g. back to /login or /onboarding).
 */
async function goto(page: Page, route: string, label: string): Promise<boolean> {
  console.log(`\n▶ ${label}  →  ${route}`)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  const url = page.url()
  if (url.includes('/login') || url.includes('/onboarding')) {
    console.warn(`  ⚠ Redirected to ${url} — skipping`)
    return false
  }
  await shot(page, `${label}-load`)
  return true
}

/**
 * Collect all interactive buttons on the current page that are:
 * - visible in the viewport
 * - not disabled
 */
async function collectButtons(page: Page): Promise<Locator[]> {
  const all = page.getByRole('button')
  const count = await all.count()
  const result: Locator[] = []

  for (let i = 0; i < count; i++) {
    const btn = all.nth(i)
    try {
      const visible = await btn.isVisible({ timeout: 2_000 })
      const disabled = await btn.isDisabled({ timeout: 2_000 })
      if (visible && !disabled) {
        result.push(btn)
      }
    } catch {
      // stale or timed out — skip
    }
  }
  return result
}

async function clickAllButtons(page: Page, pageLabel: string, origin: string) {
  const buttons = await collectButtons(page)
  console.log(`  🔘 ${buttons.length} clickable buttons found`)

  for (const btn of buttons) {
    let label = 'button'
    try {
      label = (await btn.textContent())?.trim().slice(0, 40) || (await btn.getAttribute('aria-label')) || 'icon-button'
    } catch { /* ignore */ }

    // Skip destructive / auth / dev-tools / unidentifiable icon-only buttons
    const skip = [
      'delete account', 'sign out', 'log out', 'sign-out', 'logout',
      'create account', 'sign up', 'open next.js', 'next.js dev',
      'delete', 'remove', 'collapse sidebar',
      'icon-button',  // unknown icon-only buttons — too risky (could be sign-out)
    ]
    if (skip.some(s => label.toLowerCase().includes(s))) {
      console.log(`  ⏭ Skipping button: "${label}"`)
      continue
    }

    try {
      const stillVisible = await btn.isVisible({ timeout: 2_000 })
      const stillEnabled = await btn.isEnabled({ timeout: 2_000 })
      if (!stillVisible || !stillEnabled) continue

      console.log(`  🖱 Click: "${label}"`)

      // Save URL before click so we can detect navigation
      const urlBefore = page.url()
      await btn.click({ timeout: 5_000 })
      await page.waitForTimeout(600)

      // Check if we've navigated away or if the page context is still alive
      let currentUrl = ''
      try {
        currentUrl = page.url()
      } catch {
        // page closed — break out
        console.warn(`  ⚠ Page context closed after clicking "${label}"`)
        break
      }

      // If navigated to login or somewhere completely different, go back
      if (currentUrl.includes('/login') || (!currentUrl.includes(origin) && !currentUrl.includes('localhost:3000'))) {
        await page.goto(origin, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(500)
      } else {
        await shot(page, `${pageLabel}-after-click-${slug(label.slice(0, 25))}`)
      }

      // Close any open dialog/modal
      try {
        const dialog = page.locator('[role="dialog"]:visible, [data-radix-dialog-content]:visible')
        if (await dialog.count() > 0) {
          await page.keyboard.press('Escape')
          await page.waitForTimeout(300)
        }
      } catch { /* ignore */ }

    } catch (err) {
      console.warn(`  ⚠ Could not click "${label}": ${(err as Error).message.split('\n')[0]}`)
    }
  }
}

// ── test ─────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  fs.mkdirSync(SS_DIR, { recursive: true })
  console.log(`\n📁 Screenshots → ${SS_DIR}\n`)
})

test('Full App Button Tour', async ({ page }) => {

  // ── 1. Dashboard ────────────────────────────────────────────────────────
  if (await goto(page, '/dashboard', 'Dashboard')) {
    await clickAllButtons(page, 'dashboard', '/dashboard')
  }

  // ── 2. Upload ───────────────────────────────────────────────────────────
  if (await goto(page, '/upload', 'Upload')) {
    await clickAllButtons(page, 'upload', '/upload')
  }

  // ── 3. Inbox ────────────────────────────────────────────────────────────
  if (await goto(page, '/inbox', 'Inbox')) {
    await clickAllButtons(page, 'inbox', '/inbox')
    // Click first inbox item if any
    const firstItem = page.locator('[data-testid="inbox-item"]').first()
    if (await firstItem.count() > 0) {
      await firstItem.click()
      await page.waitForTimeout(800)
      await shot(page, 'inbox-item-detail')
      await page.keyboard.press('Escape')
    }
  }

  // ── 4. Customers list ───────────────────────────────────────────────────
  if (await goto(page, '/customers', 'Customers')) {
    await clickAllButtons(page, 'customers', '/customers')
    // Click first customer row if any
    const firstRow = page.locator('table tbody tr, [data-testid="customer-row"]').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForTimeout(800)
      await shot(page, 'customers-detail-page')
      await page.goBack()
      await page.waitForTimeout(500)
    }
  }

  // ── 5. Watchlist ────────────────────────────────────────────────────────
  if (await goto(page, '/watchlist', 'Watchlist')) {
    await clickAllButtons(page, 'watchlist', '/watchlist')
  }

  // ── 6. Saved ────────────────────────────────────────────────────────────
  if (await goto(page, '/saved', 'Saved')) {
    await clickAllButtons(page, 'saved', '/saved')
  }

  // ── 7. History ──────────────────────────────────────────────────────────
  if (await goto(page, '/history', 'History')) {
    await clickAllButtons(page, 'history', '/history')
    // Click the first audit run row if any
    const firstRun = page.locator('table tbody tr, [data-testid="history-row"]').first()
    if (await firstRun.count() > 0) {
      await firstRun.click()
      await page.waitForTimeout(1000)
      await shot(page, 'history-audit-detail')
      await page.goBack()
      await page.waitForTimeout(500)
    }
  }

  // ── 8. Chargebacks ──────────────────────────────────────────────────────
  if (await goto(page, '/chargebacks', 'Chargebacks')) {
    await clickAllButtons(page, 'chargebacks', '/chargebacks')
    const firstChargeback = page.locator('table tbody tr, [data-testid="chargeback-row"]').first()
    if (await firstChargeback.count() > 0) {
      await firstChargeback.click()
      await page.waitForTimeout(800)
      await shot(page, 'chargebacks-detail')
      await page.goBack()
      await page.waitForTimeout(500)
    }
  }

  // ── 9. Lookup ───────────────────────────────────────────────────────────
  if (await goto(page, '/lookup', 'Lookup')) {
    await clickAllButtons(page, 'lookup', '/lookup')
    // Try typing in lookup search if there's an input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="lookup" i], input[placeholder*="email" i]').first()
    if (await searchInput.count() > 0) {
      await searchInput.fill('test@example.com')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      await shot(page, 'lookup-search-result')
    }
  }

  // ── 10. Settings ────────────────────────────────────────────────────────
  if (await goto(page, '/settings', 'Settings')) {
    await clickAllButtons(page, 'settings', '/settings')
  }

  if (await goto(page, '/settings/account', 'Settings – Account')) {
    await clickAllButtons(page, 'settings-account', '/settings/account')
  }

  if (await goto(page, '/settings/team', 'Settings – Team')) {
    await clickAllButtons(page, 'settings-team', '/settings/team')
  }

  if (await goto(page, '/settings/audit-trail', 'Settings – Audit Trail')) {
    await clickAllButtons(page, 'settings-audit-trail', '/settings/audit-trail')
  }

  // ── 11. Help pages ──────────────────────────────────────────────────────
  if (await goto(page, '/help', 'Help')) {
    await clickAllButtons(page, 'help', '/help')
  }

  if (await goto(page, '/help/how-it-works', 'Help – How It Works')) {
    await clickAllButtons(page, 'help-how-it-works', '/help/how-it-works')
  }

  if (await goto(page, '/help/csv-export', 'Help – CSV Export')) {
    await clickAllButtons(page, 'help-csv-export', '/help/csv-export')
  }

  // ── 12. Onboarding (read-only visit) ────────────────────────────────────
  // Visit directly without clicking "complete" flows
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  const onboardingUrl = page.url()
  if (!onboardingUrl.includes('/dashboard')) {
    await shot(page, 'onboarding-load')
  }

  // ── 13. Final dashboard state ────────────────────────────────────────────
  await goto(page, '/dashboard', 'Dashboard-Final')
  await shot(page, 'final-dashboard')

  // ── Summary ──────────────────────────────────────────────────────────────
  const files = fs.readdirSync(SS_DIR).filter(f => f.endsWith('.png'))
  console.log(`\n✅  Tour complete — ${files.length} screenshots saved to:\n   ${SS_DIR}\n`)
  expect(files.length).toBeGreaterThan(5)
})
