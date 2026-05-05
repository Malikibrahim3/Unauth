import { test, expect } from '@playwright/test'
import { signIn, extractPageText } from '../utils/test-fixtures'

const ROUTES = ['/dashboard', '/upload', '/history', '/customers', '/chargebacks', '/settings']
const CANONICAL_GRADES = ['definite', 'probable', 'possible', 'weak']

test.describe('Content compliance — merchant-facing rules', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const route of ROUTES) {
    test(`${route} uses merchant-safe copy`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const text = await extractPageText(page)
      const lowerText = text.toLowerCase()
      expect(lowerText).not.toMatch(/\b(entity resolution|heuristic|normalisation|hash)\b/)
      const visibleGrades = CANONICAL_GRADES.filter(grade => lowerText.includes(grade))
      if (lowerText.includes('confidence') || lowerText.includes('match')) {
        expect(visibleGrades.length).toBeGreaterThan(0)
      }
    })
  }
})
