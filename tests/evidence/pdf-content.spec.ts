import { test, expect } from '@playwright/test'
import { signIn } from '../utils/test-fixtures'
import { evaluatePDFContent, assertEvaluation } from '../utils/ai-evaluator'
import fs from 'fs'
import path from 'path'

test.describe('Evidence PDF content compliance', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('generated PDF meets all content rules', async ({ page }) => {
    await page.goto('/chargebacks')
    await page.waitForSelector('[data-testid="evidence-package-row"], table tbody tr', { timeout: 10000 })
    const referenceNumber = (await page.locator('[data-testid="evidence-reference"], table tbody tr td').first().textContent())?.trim() ?? ''
    expect(referenceNumber).toMatch(/UNAUTH-\d{8}-\d{6}/)

    const downloadDir = path.join(__dirname, '../reports/pdfs')
    fs.mkdirSync(downloadDir, { recursive: true })
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="download-pdf"], a[download]').first().click()
    const download = await downloadPromise
    const pdfPath = path.join(downloadDir, download.suggestedFilename())
    await download.saveAs(pdfPath)

    const pdfParse = require('pdf-parse')
    const pdfData = await pdfParse(fs.readFileSync(pdfPath))
    const pdfText = pdfData.text
    const evaluation = await evaluatePDFContent(pdfText, referenceNumber)
    assertEvaluation(evaluation, `Evidence PDF ${referenceNumber}`, 80)
    expect(pdfText.toLowerCase(), 'The word "fraud" must not appear anywhere in the evidence PDF').not.toContain('fraud')
  })
})
