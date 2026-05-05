# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux-audit.spec.ts >> Playwright UX audit >> full merchant audit journey
- Location: tests/ux-audit/ux-audit.spec.ts:59:7

# Error details

```
Test timeout of 360000ms exceeded.
```

```
Error: page.screenshot: Target page, context or browser has been closed
```

# Test source

```ts
  163 |     }
  164 | 
  165 |     await screenshot(page, 'audit-results-overview')
  166 |     await inventory(page, 'audit-results-overview')
  167 | 
  168 |     await recordDownload(page, 'audit-results-overview', 'Export CSV')
  169 | 
  170 |     await recordClick(page, 'audit-results-overview', 'Customers tab', async () => {
  171 |       await page.getByRole('tab', { name: /Customers/i }).click()
  172 |     }, 'inline')
  173 |     await screenshot(page, 'audit-results-customers-tab')
  174 |     await inventory(page, 'audit-results-customers-tab')
  175 | 
  176 |     const firstView = page.getByRole('button', { name: /View/i }).first()
  177 |     if (await firstView.isVisible({ timeout: 3000 }).catch(() => false)) {
  178 |       await recordClick(page, 'audit-results-customers-tab', 'View customer', async () => {
  179 |         await firstView.click()
  180 |         await page.waitForSelector('[role="dialog"]', { timeout: 10_000 })
  181 |       }, 'drawer')
  182 |       await screenshot(page, 'audit-customer-drawer')
  183 |       await inventory(page, 'audit-customer-drawer')
  184 |       await recordClick(page, 'audit-customer-drawer', 'Close panel', async () => {
  185 |         const closeBtn = page.getByRole('button', { name: /Close panel|Close profile|Close/i }).first()
  186 |         if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  187 |           await closeBtn.click()
  188 |           await page.waitForTimeout(500)
  189 |         }
  190 |       }, 'drawer')
  191 |     } else {
  192 |       evidence.limitations.push('No customer View button was visible on the results page.')
  193 |     }
  194 | 
  195 |     await recordClick(page, 'audit-results-customers-tab', 'Transactions tab', async () => {
  196 |       await page.getByRole('tab', { name: /Transactions/i }).click()
  197 |     }, 'inline')
  198 |     await screenshot(page, 'audit-results-transactions-tab')
  199 |     await inventory(page, 'audit-results-transactions-tab')
  200 | 
  201 |     await recordClick(page, 'audit-results-transactions-tab', 'Data quality tab', async () => {
  202 |       await page.getByRole('tab', { name: /Data quality/i }).click()
  203 |     }, 'inline')
  204 |     await screenshot(page, 'audit-results-data-quality-tab')
  205 | 
  206 |     await recordClick(page, 'audit-results-data-quality-tab', 'Risk Overview breadcrumb', async () => {
  207 |       await page.getByRole('link', { name: /Risk Overview/i }).click()
  208 |       await page.waitForURL('**/dashboard', { timeout: 30_000, waitUntil: 'commit' }).catch(async () => {
  209 |         await gotoWithFontManifestRepair(page, '/dashboard')
  210 |       })
  211 |     }, 'page')
  212 |     await screenshot(page, 'return-dashboard')
  213 | 
  214 |     const routes = ['/dashboard', '/history', '/customers', '/watchlist', '/inbox', '/chargebacks', '/settings', '/help']
  215 |     for (const route of routes) {
  216 |       await visitAndCapture(page, route.slice(1) || 'root', route)
  217 |     }
  218 |   })
  219 | })
  220 | 
  221 | async function signIn(_page: Page) {
  222 |   // Auth state is loaded via storageState in playwright.config.ts (set during global-setup).
  223 |   // This function is kept for reference but tests no longer need to call the login UI.
  224 |   void _page
  225 | }
  226 | 
  227 | async function visitAndCapture(page: Page, name: string, route: string) {
  228 |   try {
  229 |     await gotoWithFontManifestRepair(page, route)
  230 |     await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  231 |   } catch (err) {
  232 |     evidence.limitations.push(`[${name}] Navigation to ${route} failed: ${err instanceof Error ? err.message : String(err)}`)
  233 |   }
  234 |   await screenshot(page, name)
  235 |   await inventory(page, name)
  236 | }
  237 | 
  238 | async function gotoWithFontManifestRepair(page: Page, route: string) {
  239 |   repairNextFontManifest()
  240 |   try {
  241 |     await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  242 |   } catch (err) {
  243 |     repairNextFontManifest()
  244 |     await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  245 |   }
  246 | }
  247 | 
  248 | function repairNextFontManifest() {
  249 |   const serverDir = path.join(process.cwd(), '.next/server')
  250 |   if (!fs.existsSync(serverDir)) return
  251 |   const json = JSON.stringify({
  252 |     pages: {},
  253 |     app: {},
  254 |     appUsingSizeAdjust: false,
  255 |     pagesUsingSizeAdjust: false,
  256 |   })
  257 |   fs.writeFileSync(path.join(serverDir, 'next-font-manifest.json'), json)
  258 |   fs.writeFileSync(path.join(serverDir, 'next-font-manifest.js'), `self.__NEXT_FONT_MANIFEST=${JSON.stringify(json)}`)
  259 | }
  260 | 
  261 | async function screenshot(page: Page, name: string) {
  262 |   const fileName = `${name}.png`
> 263 |   await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true })
      |              ^ Error: page.screenshot: Target page, context or browser has been closed
  264 |   evidence.pagesVisited.push({ name, url: page.url(), screenshot: `screenshots/${fileName}` })
  265 | }
  266 | 
  267 | async function inventory(page: Page, pageName: string) {
  268 |   const items = await page.evaluate((name) => {
  269 |     const visible = (el: Element) => {
  270 |       const rect = el.getBoundingClientRect()
  271 |       const style = window.getComputedStyle(el)
  272 |       return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  273 |     }
  274 |     return Array.from(document.querySelectorAll('a, button, select, input, [role="button"], [role="tab"]'))
  275 |       .filter(visible)
  276 |       .map((el) => ({
  277 |         page: name,
  278 |         tag: el.tagName.toLowerCase(),
  279 |         role: el.getAttribute('role'),
  280 |         label:
  281 |           el.getAttribute('aria-label') ||
  282 |           (el as HTMLInputElement).value ||
  283 |           (el.textContent || '').replace(/\s+/g, ' ').trim() ||
  284 |           el.getAttribute('href') ||
  285 |           el.getAttribute('name') ||
  286 |           'unlabelled',
  287 |         href: el instanceof HTMLAnchorElement ? el.href : null,
  288 |         disabled: Boolean((el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled),
  289 |       }))
  290 |   }, pageName)
  291 |   evidence.inventories.push(...items)
  292 | }
  293 | 
  294 | async function recordClick(
  295 |   page: Page,
  296 |   pageName: string,
  297 |   label: string,
  298 |   action: () => Promise<void>,
  299 |   patternRecommendation: ClickRecord['patternRecommendation'],
  300 | ) {
  301 |   const before = page.url()
  302 |   try {
  303 |     await action()
  304 |     await page.waitForTimeout(400)
  305 |   } catch (err) {
  306 |     evidence.limitations.push(`[${pageName}] Click on "${label}" failed: ${err instanceof Error ? err.message : String(err)}`)
  307 |   }
  308 |   const after = page.url()
  309 |   evidence.clicks.push({
  310 |     page: pageName,
  311 |     label,
  312 |     kind: 'click',
  313 |     before,
  314 |     after,
  315 |     outcome: before === after ? 'State changed in place.' : `Navigated to ${after}`,
  316 |     patternRecommendation,
  317 |   })
  318 | }
  319 | 
  320 | async function recordDownload(page: Page, pageName: string, label: string) {
  321 |   const before = page.url()
  322 |   const btn = page.getByText(label, { exact: false })
  323 |   const visible = await btn.isVisible({ timeout: 5_000 }).catch(() => false)
  324 |   if (!visible) {
  325 |     evidence.limitations.push(`[${pageName}] "${label}" button not visible – skipped download recording.`)
  326 |     evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: 'Button not visible – skipped.', patternRecommendation: 'inline' })
  327 |     return
  328 |   }
  329 |   try {
  330 |     const downloadPromise = page.waitForEvent('download', { timeout: 12_000 })
  331 |     await btn.click()
  332 |     const download = await downloadPromise
  333 |     const savePath = path.join(DOWNLOAD_DIR, download.suggestedFilename())
  334 |     await download.saveAs(savePath)
  335 |     evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: `Downloaded ${download.suggestedFilename()}`, patternRecommendation: 'inline' })
  336 |   } catch (err) {
  337 |     evidence.limitations.push(`[${pageName}] "${label}" did not trigger a file download within 12 s: ${err instanceof Error ? err.message : String(err)}`)
  338 |     evidence.clicks.push({ page: pageName, label, kind: 'download', before, after: page.url(), outcome: 'No download event fired – likely opens a modal or inline state instead.', patternRecommendation: 'inline' })
  339 |   }
  340 | }
  341 | 
  342 | function discoverRoutes() {
  343 |   const appDir = path.join(process.cwd(), 'app')
  344 |   const routes: string[] = []
  345 |   const walk = (dir: string) => {
  346 |     for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  347 |       const fullPath = path.join(dir, entry.name)
  348 |       if (entry.isDirectory()) {
  349 |         walk(fullPath)
  350 |         continue
  351 |       }
  352 |       if (entry.name !== 'page.tsx') continue
  353 |       const rel = path.relative(appDir, path.dirname(fullPath))
  354 |       const route =
  355 |         '/' +
  356 |         rel
  357 |           .split(path.sep)
  358 |           .filter((part) => !part.startsWith('('))
  359 |           .map((part) => (part.startsWith('[') ? `:${part.slice(1, -1)}` : part))
  360 |           .join('/')
  361 |       routes.push(route === '/' ? '/' : route.replace(/\/+/g, '/'))
  362 |     }
  363 |   }
```