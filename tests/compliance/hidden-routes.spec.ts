import { test, expect } from '@playwright/test'
import { signIn } from '../utils/test-fixtures'

const HIDDEN_ROUTES = ['/settings/team', '/settings/billing', '/settings/notifications', '/settings/audit-trail']

test.describe('Hidden routes redirect correctly', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const route of HIDDEN_ROUTES) {
    test(`${route} redirects to /settings`, async ({ page }) => {
      await page.goto(route)
      await page.waitForURL('**/settings', { timeout: 5000 })
      expect(page.url()).toContain('/settings')
    })
  }

  test('settings page does not show team, billing, or notifications cards', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const text = await page.evaluate(() => document.body.innerText.toLowerCase())
    expect(text, 'Team management card should not be visible').not.toContain('team members')
    expect(text, 'Billing card should not be visible').not.toContain('billing')
    expect(text, 'Notifications card should not be visible').not.toContain('notification settings')
  })
})
