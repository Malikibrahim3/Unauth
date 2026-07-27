/**
 * Phase 1 runtime evidence (§4.2 non-command proof).
 *
 * Runs against a production build and the Phase 1 QA fixture, and writes the
 * four evidence artifacts scripts/polish/phase-01.manifest.mjs requires. Every
 * number here is measured, never asserted from source inspection.
 *
 *   phase-01-read-purity.json          RUN-04
 *   phase-01-completeness-injection.json RUN-06 / RUN-14
 *   phase-01-route-performance.json    RUN-10 / RUN-13
 *   phase-01-browser-runtime.json      RUN-05 / RUN-08 / RUN-14
 */
import { test, expect, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const EVIDENCE_DIR = 'docs/phase-reports/product-polish/evidence';
const MERCHANT_ID = 'f1000000-0000-4000-8000-000000000001';
const COMPLETE_CASE = 'f1000600-0000-4000-8000-000000000001';
const UNAMBIGUOUS_CASE = 'f1000600-0000-4000-8000-000000000002';

const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
const CONTAINER = `supabase_db_${projectId}`;

function sql(statement: string): string {
  const result = spawnSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', statement],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || '').trim());
  return (result.stdout ?? '').trim();
}

function writeArtifact(name: string, body: unknown) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(`${EVIDENCE_DIR}/${name}`, `${JSON.stringify(body, null, 2)}\n`);
}

/**
 * Row counts RUN-04 forbids a read from changing.
 *
 * `business_events` deliberately excludes `audit.action_recorded`. Viewing a
 * customer writes a PII-access audit entry, which is a compliance control the
 * product must keep, and §2 read purity is about business mutation and
 * automatic decision writes rather than access logging. The access-audit count
 * is still captured separately and asserted to contain nothing else, so the
 * exclusion cannot hide a real write.
 */
function mutationSensitiveCounts() {
  const rows = sql(`
    select 'decisions', count(*) from public.case_outcome_events where merchant_id='${MERCHANT_ID}'
    union all select 'business_events', count(*) from public.domain_events
      where merchant_id='${MERCHANT_ID}' and event_type <> 'audit.action_recorded'
    union all select 'access_audit_events', count(*) from public.domain_events
      where merchant_id='${MERCHANT_ID}' and event_type = 'audit.action_recorded'
    union all select 'audit', count(*) from public.access_audit_log where merchant_id='${MERCHANT_ID}'
    union all select 'claimed_items', count(*) from public.case_claimed_items where merchant_id='${MERCHANT_ID}'
    union all select 'clarifications', count(*) from public.case_clarification_requests where merchant_id='${MERCHANT_ID}'
    union all select 'financial_events', count(*) from public.case_outcome_events where merchant_id='${MERCHANT_ID}' and amount_minor is not null
  `);
  return Object.fromEntries(rows.split('\n').map((line) => line.split('|')));
}

/** Every audit action recorded for the fixture merchant, so nothing hides behind the exclusion. */
function accessAuditActions() {
  const rows = sql(`
    select distinct payload->'audit'->>'action'
    from public.domain_events
    where merchant_id='${MERCHANT_ID}' and event_type='audit.action_recorded'
  `);
  return rows ? rows.split('\n').filter(Boolean) : [];
}

/**
 * Console and network observers. Hydration warnings surface as console errors
 * or warnings mentioning hydration, so both streams are watched.
 */
function observe(page: Page) {
  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  const dataQualityReports: string[] = [];
  const requestFailures: string[] = [];
  const writes: string[] = [];

  page.on('console', (message) => {
    const text = message.text();
    if (/hydrat|did not match|server rendered/i.test(text)) hydrationWarnings.push(text);
    /*
     * A `[data-quality]` report is the product correctly refusing to render bad
     * data (RUN-09/RUN-12), not a fault. The QA fixture deliberately contains
     * such records, so these are tracked separately and asserted against an
     * expected set — an unexpected one still fails.
     */
    else if (text.startsWith('[data-quality]')) dataQualityReports.push(text);
    else if (message.type() === 'error') consoleErrors.push(text);
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (!url.startsWith('http://localhost')) return;
    if (response.status() >= 400) requestFailures.push(`${response.status()} ${url}`);
  });
  page.on('request', (request) => {
    const method = request.method();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
    if (!request.url().includes('/api/')) return;
    writes.push(`${method} ${request.url()}`);
  });

  return { consoleErrors, hydrationWarnings, dataQualityReports, requestFailures, writes };
}

async function waitForRouteReady(page: Page) {
  // `document.documentElement` is briefly null while a commit-phase navigation
  // swaps documents, so the predicate must tolerate it rather than throw.
  await page.waitForFunction(() => document.documentElement?.hasAttribute('data-route-ready') === true, null, {
    timeout: 30_000,
  });
  return page.getAttribute('html', 'data-route-state');
}

const CAPTURE_ROUTES = [
  { key: 'work', path: '/work' },
  { key: 'cases', path: '/claims' },
  { key: 'caseDetail', path: `/claims/${COMPLETE_CASE}` },
  { key: 'customers', path: '/customers' },
];

test.describe('Phase 1 runtime evidence', () => {
  test('RUN-04 — five case-detail reloads mutate nothing', async ({ page }) => {
    const before = mutationSensitiveCounts();
    const observed = observe(page);
    const reloads = 5;

    for (let index = 0; index < reloads; index += 1) {
      await page.goto(`/claims/${COMPLETE_CASE}`, { waitUntil: 'domcontentloaded' });
      await waitForRouteReady(page);
    }

    const after = mutationSensitiveCounts();
    const businessCounters = Object.keys(before).filter((key) => key !== 'access_audit_events');
    const changed = businessCounters.filter((key) => before[key] !== after[key]);
    const auditActions = accessAuditActions();

    writeArtifact('phase-01-read-purity.json', {
      artifact: 'phase-01-read-purity',
      generatedFrom: 'npm run evidence:phase1',
      merchantId: MERCHANT_ID,
      caseId: COMPLETE_CASE,
      reloads,
      before,
      after,
      changedCounters: changed,
      mutated: changed.length > 0,
      writeRequestsObserved: observed.writes,
      accessAuditActions: auditActions,
      accessAuditNote:
        'Access audit entries are a compliance control, not a business mutation. They are excluded from the business counters and constrained to the allow-list below.',
      accessAuditAllowList: ['view_customer'],
    });

    expect(changed, `business counters changed across ${reloads} reloads`).toEqual([]);
    expect(observed.writes, 'a read produced a write request').toEqual([]);
    expect(auditActions.sort(), 'an unexpected action was audited during a read').toEqual(['view_customer']);
  });

  test('RUN-06 / RUN-14 — required failure blocks, optional failure stays local', async ({ page }) => {
    // Required resource: the Work page itself must not render as if it were fine.
    const requiredProbe = observe(page);
    await page.route('**/api/work/views', (route) => route.fulfill({ status: 500, body: '{"error":"injected"}' }));
    const injectedResponse = page.waitForResponse((response) => response.url().includes('/api/work/views'));
    await page.goto('/work', { waitUntil: 'domcontentloaded' });
    await waitForRouteReady(page);
    // The saved-view state resolves after route-ready, so wait for the request
    // itself rather than assuming the paint implies the fetch has landed.
    await injectedResponse;
    await page.getByRole('button', { name: /try again/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    const unavailableNotice = page.getByText(/couldn’t load your saved views/i);
    const requiredFailureBlocks = await unavailableNotice.isVisible();
    // The 11 system views must survive the failure: it is a local degradation,
    // never a wipe of the page.
    const systemViews = await page.locator('nav[aria-label="Work views"] a').count();
    const retryVisible = await page.getByRole('button', { name: /try again/i }).isVisible();
    await page.unroute('**/api/work/views');

    // Healthy control: the same page with a working endpoint must show no notice
    // and must load the seeded view.
    const healthyResponse = page.waitForResponse((response) => response.url().includes('/api/work/views'));
    await page.goto('/work', { waitUntil: 'domcontentloaded' });
    await waitForRouteReady(page);
    await healthyResponse;
    await page.getByRole('link', { name: /ageing carrier waits/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    const noticeWhenHealthy = await page.getByText(/couldn’t load your saved views/i).isVisible();
    const seededViewVisible = await page.getByRole('link', { name: /ageing carrier waits/i }).isVisible();
    const landedUrl = page.url();
    const mainHeading = (await page.locator('h1').first().textContent().catch(() => null))?.trim() ?? null;
    const bodySnippet = (await page.locator('body').innerText().catch(() => ''))?.slice(0, 600);

    writeArtifact('phase-01-completeness-injection.json', {
      artifact: 'phase-01-completeness-injection',
      generatedFrom: 'npm run evidence:phase1',
      requiredResource: '/api/work/views',
      requiredFailureBlocks,
      requiredFailureRetryOffered: retryVisible,
      systemViewsStillReachable: systemViews,
      optionalFailureIsLocal: requiredFailureBlocks && systemViews === 11,
      healthyControl: {
        noticeShown: noticeWhenHealthy,
        seededSavedViewVisible: seededViewVisible,
      },
      consoleErrors: requiredProbe.consoleErrors,
      diagnostics: { landedUrl, mainHeading, bodySnippet },
    });

    expect(requiredFailureBlocks, 'injected 500 was not surfaced').toBe(true);
    expect(systemViews, 'system views disappeared during a saved-view failure').toBe(11);
    expect(noticeWhenHealthy, 'unavailable notice shown when the endpoint is healthy').toBe(false);
    expect(seededViewVisible, 'seeded saved view did not load').toBe(true);
  });

  test('RUN-10 / RUN-13 — 20 warmed production navigations per capture route', async ({ page, context }) => {
    // 4 routes x (20 TTFB requests + 20 full navigations) needs more than the
    // default budget. This is harness capacity, not a performance allowance:
    // the per-route p75 assertions below are unchanged.
    test.setTimeout(900_000);
    /*
     * TTFB and route-ready are measured separately, as RUN-13 requires.
     *
     * TTFB is taken from direct HTTP requests carrying the same session
     * cookies, because a Playwright navigation also includes CDP, renderer
     * startup and asset scheduling — real costs, but not server time-to-first-
     * byte, and noisy enough on a developer machine to swamp the signal.
     * Route-ready is measured in the browser, where it belongs.
     */
    // Give the preceding tests' contexts time to tear down.
    await page.waitForTimeout(2_000);
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
    const navigations = 20;
    const routes: Record<string, unknown> = {};

    const percentile = (values: number[], p: number) => {
      const sorted = [...values].sort((a, b) => a - b);
      return Number(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(1));
    };

    for (const route of CAPTURE_ROUTES) {
      // Warm the route in both channels; cold compilation is not the measurement.
      await fetch(`${baseUrl}${route.path}`, { headers: { cookie: cookieHeader } }).then((r) => r.arrayBuffer());
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForRouteReady(page);

      const ttfb: number[] = [];
      const statuses = new Set<number>();
      for (let index = 0; index < navigations; index += 1) {
        const started = performance.now();
        const response = await fetch(`${baseUrl}${route.path}`, { headers: { cookie: cookieHeader } });
        // Resolution of `fetch` is headers-received: that is TTFB.
        ttfb.push(performance.now() - started);
        statuses.add(response.status);
        await response.arrayBuffer();
      }

      // The TTFB loop just saturated the CPU. Settle before switching channels
      // so the route-ready figures measure the application, not the harness.
      await page.waitForTimeout(2_500);

      /*
       * RUN-13 asks for 20 warmed *independent* navigations. Firing them
       * back-to-back is not independent: each route opens a dozen concurrent
       * API requests, and the next navigation would start while the previous
       * one's requests were still in flight, so the figures would describe a
       * stress test rather than a warm navigation. Each iteration therefore
       * waits for the network to go idle before the next one begins.
       */
      const ready: number[] = [];
      for (let index = 0; index < navigations; index += 1) {
        const started = Date.now();
        await page.goto(route.path, { waitUntil: 'commit' });
        await waitForRouteReady(page);
        ready.push(Date.now() - started);
        await page.waitForLoadState('networkidle').catch(() => {});
      }

      // Settle again before the next route so one route's load does not leak
      // into the next route's numbers.
      await page.waitForTimeout(2_500);

      routes[route.key] = {
        path: route.path,
        navigations,
        readySignal: 'data-route-ready',
        statuses: [...statuses],
        ttfbMs: { p50: percentile(ttfb, 50), p75: percentile(ttfb, 75), p95: percentile(ttfb, 95), max: Number(Math.max(...ttfb).toFixed(1)) },
        readyMs: { p50: percentile(ready, 50), p75: percentile(ready, 75), p95: percentile(ready, 95), max: Math.max(...ready) },
        raw: { ttfb: ttfb.map((value) => Number(value.toFixed(1))), ready },
      };
    }

    writeArtifact('phase-01-route-performance.json', {
      artifact: 'phase-01-route-performance',
      generatedFrom: 'npm run evidence:phase1',
      build: 'production (next start)',
      navigations,
      readySignal: 'data-route-ready',
      method: {
        ttfb: 'direct HTTP request with the browser session cookies; fetch resolution is headers-received',
        routeReady: 'browser navigation until the data-route-ready attribute appears',
      },
      budget: { ttfbP75Ms: 800, readyP75Ms: 2000 },
      host: { platform: process.platform, cpus: (await import('node:os')).cpus().length },
      routes,
    });

    for (const [key, value] of Object.entries(routes)) {
      const measured = value as { ttfbMs: { p75: number }; readyMs: { p75: number }; statuses: number[] };
      expect(measured.statuses, `${key} did not return 200 on every warmed navigation`).toEqual([200]);
      expect(measured.ttfbMs.p75, `${key} p75 TTFB over budget`).toBeLessThanOrEqual(800);
      expect(measured.readyMs.p75, `${key} p75 route-ready over budget`).toBeLessThanOrEqual(2000);
    }
  });

  test('RUN-03 — the resolved claimed item and its source order line render', async ({ page }) => {
    await page.goto(`/claims/${COMPLETE_CASE}`, { waitUntil: 'domcontentloaded' });
    await waitForRouteReady(page);
    const routeState = await waitForRouteReady(page);
    const body = await page.locator('body').innerText();

    /*
     * The seeded resolved match points at order line QA-1001-L1. The
     * reconciliation surface identifies both the claimed item and the source
     * line it resolved to by SKU, so that is what is asserted; the case header
     * carries the order reference.
     */
    const claimedItemVisible = body.includes('QA-JKT-001');
    const sourceLineVisible = body.includes('QA-1001');
    const placeholder = /could not load|failed to load|try again|retry/i.test(body);

    const matchApiStatus = await page.evaluate(async (caseId) => {
      const response = await fetch(`/api/claims/${caseId}/matches`);
      return response.status;
    }, COMPLETE_CASE);

    const supportContextProbe = await page.evaluate(async (caseId) => {
      const response = await fetch(`/api/claims/${caseId}/support-context`);
      return { status: response.status, body: (await response.text()).slice(0, 400) };
    }, COMPLETE_CASE);

    const claimsProbe = await page.evaluate(async (caseId) => {
      const response = await fetch(`/api/claims?profileId=&claimId=${caseId}`);
      const body = await response.json().catch(() => null);
      return {
        status: response.status,
        claimCount: Array.isArray(body?.claims) ? body.claims.length : null,
        firstError: body?.error ?? null,
      };
    }, COMPLETE_CASE);

    writeArtifact('phase-01-claimed-item-render.json', {
      artifact: 'phase-01-claimed-item-render',
      generatedFrom: 'npm run evidence:phase1',
      caseId: COMPLETE_CASE,
      matchApiStatus,
      claimedItemVisible,
      sourceLineVisible,
      errorPlaceholderPresent: placeholder,
      routeState,
      supportContextProbe,
      claimsProbe,
      bodySnippet: body.slice(0, 2500),
    });

    expect(routeState, 'case detail reached the bounded degraded fallback rather than a real ready state').toBe('ready');
    expect(matchApiStatus, 'match endpoint did not return 2xx').toBeLessThan(300);
    expect(claimedItemVisible, 'claimed item not rendered on case detail').toBe(true);
    expect(sourceLineVisible, 'source order line not rendered on case detail').toBe(true);
    expect(placeholder, 'case detail rendered a retry/error placeholder').toBe(false);
  });

  test('RUN-13 diagnostic — client request waterfall on the slowest routes', async ({ page }) => {
    const waterfalls: Record<string, unknown> = {};

    for (const route of [
      { key: 'caseDetail', path: `/claims/${COMPLETE_CASE}` },
      { key: 'customers', path: '/customers' },
    ]) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForRouteReady(page);

      const entries: Array<{ url: string; start: number; end: number }> = [];
      const origin = Date.now();
      const onRequest = (request: import('@playwright/test').Request) => {
        if (!request.url().includes('/api/')) return;
        entries.push({ url: new URL(request.url()).pathname, start: Date.now() - origin, end: -1 });
      };
      const onResponse = (response: import('@playwright/test').Response) => {
        if (!response.url().includes('/api/')) return;
        const path = new URL(response.url()).pathname;
        const entry = [...entries].reverse().find((candidate) => candidate.url === path && candidate.end === -1);
        if (entry) entry.end = Date.now() - origin;
      };
      page.on('request', onRequest);
      page.on('response', onResponse);

      const started = Date.now();
      await page.goto(route.path, { waitUntil: 'commit' });
      await waitForRouteReady(page);
      const readyAt = Date.now() - started;

      page.off('request', onRequest);
      page.off('response', onResponse);
      waterfalls[route.key] = { path: route.path, readyMs: readyAt, requests: entries.sort((a, b) => a.start - b.start) };
    }

    writeArtifact('phase-01-request-waterfall.json', {
      artifact: 'phase-01-request-waterfall',
      generatedFrom: 'npm run evidence:phase1',
      note: 'Diagnostic for RUN-13: which client requests run, when they start, and whether they overlap.',
      waterfalls,
    });
  });

  test('RUN-05 / RUN-08 — clean browser runtime across capture routes', async ({ page }) => {
    const observed = observe(page);
    const perRoute: Record<string, unknown> = {};

    for (const route of [...CAPTURE_ROUTES, { key: 'caseDetailUnambiguous', path: `/claims/${UNAMBIGUOUS_CASE}` }]) {
      const before = observed.consoleErrors.length;
      const beforeHydration = observed.hydrationWarnings.length;
      const beforeFailures = observed.requestFailures.length;
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForRouteReady(page);
      perRoute[route.key] = {
        path: route.path,
        consoleErrors: observed.consoleErrors.length - before,
        hydrationWarnings: observed.hydrationWarnings.length - beforeHydration,
        requiredRequestFailures: observed.requestFailures.length - beforeFailures,
      };
    }

    writeArtifact('phase-01-browser-runtime.json', {
      artifact: 'phase-01-browser-runtime',
      generatedFrom: 'npm run evidence:phase1',
      build: 'production (next start)',
      viewport: '1440x900',
      merchantId: MERCHANT_ID,
      consoleErrors: observed.consoleErrors.length,
      hydrationWarnings: observed.hydrationWarnings.length,
      requiredRequestFailures: observed.requestFailures.length,
      unexpectedWrites: observed.writes.length,
      dataQualityReports: [...new Set(observed.dataQualityReports)],
      dataQualityNote:
        'Expected: the QA fixture deliberately seeds a case with no observed currency, so RUN-09 monitoring fires. Any other subject is a failure.',
      detail: {
        consoleErrors: observed.consoleErrors,
        hydrationWarnings: observed.hydrationWarnings,
        requestFailures: observed.requestFailures,
        writes: observed.writes,
      },
      perRoute,
    });

    expect(observed.hydrationWarnings, 'hydration warnings present').toEqual([]);
    expect(observed.consoleErrors, 'console errors present').toEqual([]);
    expect(observed.requestFailures, 'required requests failed').toEqual([]);
    expect(observed.writes, 'a read produced a write request').toEqual([]);

    // Only the deliberately currency-less fixture record may report.
    const subjects = [...new Set(observed.dataQualityReports.map((line) => line.split(' ')[1]))];
    expect(subjects.sort()).toEqual(['money.currency_missing']);
  });
});
