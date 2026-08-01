import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { buildMarketingFixture } from '../marketing-seed/fixture.mjs';
import { MARKETING_STORY } from '../marketing-seed/manifest.mjs';
import {
  AUTHENTICATED_PAGE_FAMILY_EDGE_ROUTES,
  FLAGSHIP_ROUTES,
  LIVING_PRECISION_ROUTES,
} from './manifest.mjs';
import {
  LIVING_PRECISION_ENVIRONMENT as environment,
  RELEASE_CAPTURE_ENV_KEYS,
} from './environment.mjs';

const root = process.cwd();
const verifyMode = process.argv.includes('--verify');
const allowHost = process.env.LIVING_PRECISION_ALLOW_HOST === '1';
const baseUrl = process.env[RELEASE_CAPTURE_ENV_KEYS.baseUrl] ?? 'http://127.0.0.1:3000';
const developmentBaseUrl = process.env[RELEASE_CAPTURE_ENV_KEYS.developmentBaseUrl];
const authSecret = process.env[RELEASE_CAPTURE_ENV_KEYS.authSecret] ?? 'local-marketing-auth';
const outputRoot = path.resolve(
  root,
  process.env[RELEASE_CAPTURE_ENV_KEYS.outputRoot] ?? 'artifacts/living-precision',
);
const runName = verifyMode ? 'run-b' : 'run-a';
const runDirectory = path.join(outputRoot, runName);
const screenshotDirectory = path.join(runDirectory, 'routes');
const edgeDirectory = path.join(runDirectory, 'edge');
const flagshipDirectory = path.join(runDirectory, 'flagship');
const candidateDirectory = path.join(runDirectory, 'product-proof');
const failures = [];
const routeEvidence = [];
const SCORECARD_DIMENSIONS = Object.freeze([
  'purposeAndHierarchy',
  'composition',
  'typography',
  'colour',
  'dataStory',
  'chartOrWorkSurfaceCraft',
  'interactionAndMotion',
  'statesAndDataTruth',
  'accessibility',
  'responsiveBehavior',
  'screenshotCredibility',
  'productCredibility',
]);
const marketingCaptureIds = Object.freeze([
  'CAPTURE-case-evidence',
  'CAPTURE-case-recommendation',
]);
const marketingCandidateRouteIds = Object.freeze([
  'R07',
  'R02',
  'R01',
  'R16',
  'R05',
  'R32',
  'R30',
]);

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function gitOutput(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function captureUrl(origin, capturePath) {
  const url = new URL(capturePath, origin);
  url.searchParams.set('capture', '1');
  return url.toString();
}

function slug(route) {
  return `${route.id}-${route.route === '/' ? 'root' : route.route
    .replaceAll('[', '')
    .replaceAll(']', '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')}`;
}

function exactPathAndContext(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function expectedRedirect(entry, proofPath) {
  const source = new URL(proofPath, baseUrl);
  const remaining = new URLSearchParams(source.search);
  if (entry.id === 'R03') {
    const claimId = remaining.get('claimId');
    remaining.delete('claimId');
    if (claimId) return `/claims/${claimId}${remaining.size ? `?${remaining}` : ''}${source.hash}`;
    return `/customers/${MARKETING_STORY.capture.customer}${remaining.size ? `?${remaining}` : ''}#cases`;
  }
  if (entry.id === 'R10') {
    remaining.set('view', 'integration-exceptions');
    return `/work?${remaining}${source.hash}`;
  }
  return `${entry.destination}${remaining.size ? `?${remaining}` : ''}${source.hash}`;
}

function optionalResource(url) {
  return /(?:amplitude|sentry|analytics|fonts\.gstatic|fonts\.googleapis|favicon|manifest\.json)/i.test(url);
}

function optionalFailedRequest(request) {
  const url = new URL(request.url());
  const errorText = request.failure()?.errorText ?? '';
  if (optionalResource(url.toString())) return true;
  if (request.method() !== 'GET' || !errorText.includes('ERR_ABORTED')) return false;
  return url.searchParams.has('_rsc') || url.pathname === '/api/notifications/unread-count';
}

function privacyDefects(text) {
  const defects = [];
  const sensitivePatterns = [
    /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{12,}\b/g,
    /\b(?:service[_ -]?role|api[_ -]?secret|bearer)\s*[:=]\s*\S+/gi,
    /\b(?:password|access[_ -]?token|refresh[_ -]?token)\s*[:=]\s*\S+/gi,
    /\b(?:\d[ -]*?){13,19}\b/g,
  ];
  for (const pattern of sensitivePatterns) {
    defects.push(...(text.match(pattern) ?? []));
  }
  const emails = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? [];
  defects.push(...emails.filter((email) => {
    const normalized = email.toLowerCase();
    return !normalized.endsWith('.invalid')
      && !normalized.endsWith('@unauth.co.uk')
      && !normalized.endsWith('@unauth.app')
      && !normalized.endsWith('@unauth.co')
      && !normalized.includes('@customers.alderandash.');
  }));
  return defects;
}

async function runtimeStrings(page) {
  return page.evaluate(async () => {
    const aria = Array.from(document.querySelectorAll('[aria-label], [alt], [title]'))
      .flatMap((element) => [
        element.getAttribute('aria-label'),
        element.getAttribute('alt'),
        element.getAttribute('title'),
      ])
      .filter(Boolean);
    let accessibility = [];
    try {
      const session = await globalThis.__LP_CAPTURE_CDP__;
      accessibility = session ?? [];
    } catch {
      accessibility = [];
    }
    return [
      document.title,
      document.body.innerText,
      ...aria,
      ...accessibility,
    ].join('\n');
  });
}

async function installAccessibilitySnapshot(page) {
  const session = await page.context().newCDPSession(page);
  const tree = await session.send('Accessibility.getFullAXTree');
  const strings = tree.nodes.flatMap((node) => [
    node.name?.value,
    node.description?.value,
    node.value?.value,
  ]).filter((value) => typeof value === 'string');
  await page.evaluate((values) => {
    globalThis.__LP_CAPTURE_CDP__ = Promise.resolve(values);
  }, strings);
}

async function routeDiagnostics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const transientSelectors = [
      '[aria-busy="true"]',
      '[data-loading="true"]',
      '[data-state="loading"]',
      '[role="progressbar"]:not([aria-valuenow])',
    ];
    const transient = transientSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector))
        .filter((element) => {
          if (element.closest('[data-capture-static-state="true"]')) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((element) => `${selector}:${element.textContent?.trim().slice(0, 80) ?? ''}`),
    );
    const hangingCopy = Array.from(document.querySelectorAll('body *'))
      .filter((element) => element.children.length === 0)
      .filter((element) => !element.closest('[data-capture-static-state="true"]'))
      .map((element) => element.textContent?.trim() ?? '')
      .filter((text) => /^(?:loading|saving|connecting|syncing|preparing)(?:\s|…|\.{3}|$)/i.test(text));
    return {
      captureReady: root.getAttribute('data-capture-ready'),
      routeReady: root.getAttribute('data-route-ready'),
      routeState: root.getAttribute('data-route-state'),
      captureClock: root.getAttribute('data-capture-clock'),
      captureNow: root.getAttribute('data-capture-now'),
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      transient,
      hangingCopy,
      appShells: document.querySelectorAll('.ua-app').length,
    };
  });
}

async function createContext(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: environment.deviceScaleFactor,
    locale: environment.locale,
    timezoneId: environment.timezoneId,
    colorScheme: options.colorScheme ?? environment.colorScheme,
    reducedMotion: options.reducedMotion ?? 'no-preference',
    forcedColors: options.forcedColors ?? 'none',
    serviceWorkers: 'block',
  });
  if (options.colorScheme === 'dark') {
    await context.addInitScript(() => {
      localStorage.setItem('unauth.theme', 'dark');
    });
  } else {
    await context.addInitScript(() => {
      localStorage.setItem('unauth.theme', 'light');
    });
  }
  return context;
}

async function authenticate(context, origin, merchantId) {
  const page = await context.newPage();
  const authUrl = new URL('/api/test/e2e-auth', origin);
  authUrl.searchParams.set('secret', authSecret);
  authUrl.searchParams.set('merchant_id', merchantId);
  authUrl.searchParams.set('redirect', '/legal/privacy?capture_session=ready');
  try {
    const response = await page.goto(authUrl.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    if (!response?.ok() || !page.url().includes('capture_session=ready')) {
      throw new Error(`HTTP ${response?.status() ?? 'unknown'} at ${page.url()}`);
    }
  } finally {
    await page.close();
  }
}

async function captureOne(context, entry, origin, destination, directory, variant = 'light') {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const failedRequestCandidates = [];
  const optionalFailedRequests = [];
  const successfulRequests = new Set();
  const failedResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = `${request.method()} ${request.url()} · ${request.failure()?.errorText ?? 'failed'}`;
    if (optionalFailedRequest(request)) optionalFailedRequests.push(failure);
    else {
      failedRequestCandidates.push({
        key: `${request.method()} ${request.url()}`,
        method: request.method(),
        errorText: request.failure()?.errorText ?? 'failed',
        failure,
      });
    }
  });
  page.on('response', (response) => {
    if (response.status() < 400) {
      successfulRequests.add(`${response.request().method()} ${response.url()}`);
    }
    if (response.status() >= 400 && !optionalResource(response.url())) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  const target = captureUrl(origin, destination);
  const navigation = await page.goto(target, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  if (!navigation?.ok()) fail(`${entry.id} navigation returned HTTP ${navigation?.status() ?? 'unknown'}`);

  try {
    await page.locator('html[data-capture-ready="true"]').waitFor({ timeout: 20_000 });
  } catch {
    fail(`${entry.id} did not reach capture-ready`);
  }
  await installAccessibilitySnapshot(page);
  const diagnostics = await routeDiagnostics(page);
  const visibleAndAccessibleText = await runtimeStrings(page);
  const privacy = privacyDefects(visibleAndAccessibleText);
  const filename = `${slug(entry)}-${variant}.png`;
  const file = path.join(directory, filename);
  let screenshot = null;
  try {
    await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' });
    screenshot = await readFile(file);
  } catch (error) {
    fail(`${entry.id} screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  for (const candidate of failedRequestCandidates) {
    if (
      candidate.method === 'GET'
      && candidate.errorText.includes('ERR_ABORTED')
      && successfulRequests.has(candidate.key)
    ) {
      optionalFailedRequests.push(candidate.failure);
    } else {
      failedRequests.push(candidate.failure);
    }
  }

  if (diagnostics.captureReady !== 'true') fail(`${entry.id} capture readiness attribute is absent`);
  if (diagnostics.routeState !== 'ready') fail(`${entry.id} settled as ${diagnostics.routeState ?? 'unknown'}`);
  if (diagnostics.captureClock !== 'frozen' || diagnostics.captureNow !== environment.clock) {
    fail(`${entry.id} did not use the recorded frozen clock`);
  }
  if (diagnostics.horizontalOverflow > 1) fail(`${entry.id} overflows horizontally by ${diagnostics.horizontalOverflow}px`);
  if (entry.session === 'authenticated' && diagnostics.appShells !== 1) {
    fail(`${entry.id} rendered ${diagnostics.appShells} authenticated shells`);
  }
  if (diagnostics.transient.length || diagnostics.hangingCopy.length) {
    fail(`${entry.id} retained transient UI: ${[...diagnostics.transient, ...diagnostics.hangingCopy].join(' | ')}`);
  }
  if (consoleErrors.length) fail(`${entry.id} console errors: ${consoleErrors.join(' | ')}`);
  if (pageErrors.length) fail(`${entry.id} uncaught errors: ${pageErrors.join(' | ')}`);
  if (failedRequests.length) fail(`${entry.id} required request failures: ${failedRequests.join(' | ')}`);
  if (failedResponses.length) fail(`${entry.id} failed required responses: ${failedResponses.join(' | ')}`);
  if (privacy.length) fail(`${entry.id} privacy deny-list matches: ${privacy.join(' | ')}`);

  const evidence = {
    id: entry.id,
    route: entry.route,
    capturePath: destination,
    finalUrl: exactPathAndContext(new URL(page.url())),
    variant,
    file: screenshot ? path.relative(runDirectory, file) : null,
    sha256: screenshot ? sha256(screenshot) : null,
    bytes: screenshot?.length ?? 0,
    diagnostics,
    runtime: {
      consoleErrors,
      pageErrors,
      failedRequests,
      optionalFailedRequests,
      failedResponses,
      privacy,
    },
  };
  routeEvidence.push(evidence);
  await page.close();
  if (!failures.some((failure) => failure.startsWith(entry.id))) pass(`${entry.id} ${entry.route} ${variant}`);
  return { file: screenshot ? file : null, evidence };
}

async function proveRedirect(context, entry) {
  const page = await context.newPage();
  for (const proofPath of entry.proofPaths) {
    await page.goto(new URL(proofPath, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    const expected = expectedRedirect(entry, proofPath);
    await page.waitForURL(
      (url) => exactPathAndContext(url) === expected,
      { timeout: 20_000 },
    ).catch(() => {});
    const actual = exactPathAndContext(new URL(page.url()));
    const navigationProof = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        redirectCount: typeof navigation?.redirectCount === 'number'
          ? navigation.redirectCount
          : 0,
        theme: document.documentElement.getAttribute('data-theme'),
        authenticatedShells: document.querySelectorAll('.ua-app').length,
      };
    });
    if (actual !== expected) fail(`${entry.id} redirected to ${actual}; expected ${expected}`);
    else if (navigationProof.redirectCount < 1) fail(`${entry.id} did not use an HTTP redirect`);
    else if (navigationProof.theme !== 'light') fail(`${entry.id} did not retain the pre-paint theme`);
    else if (entry.session === 'authenticated' && navigationProof.authenticatedShells !== 1) {
      fail(`${entry.id} final destination rendered ${navigationProof.authenticatedShells} authenticated shells`);
    }
    else pass(`${entry.id} redirect preserves destination context`);
    routeEvidence.push({
      id: entry.id,
      route: entry.route,
      classification: 'redirect',
      source: proofPath,
      destination: actual,
      expected,
      navigationProof,
    });
  }
  await page.close();
}

async function verifyDevelopment404(context, entry) {
  const page = await context.newPage();
  const response = await page.goto(captureUrl(baseUrl, entry.capturePath), {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  if (response?.status() !== 404) fail(`${entry.id} must return production HTTP 404; received ${response?.status() ?? 'unknown'}`);
  else pass(`${entry.id} production 404`);
  routeEvidence.push({
    id: entry.id,
    route: entry.route,
    classification: 'development-production-proof',
    status: response?.status() ?? null,
  });
  await page.close();
}

async function encodeProductProof({
  sourceFile,
  sourceId,
  sourcePath,
  outputFile,
  sourceCrop,
  display,
  output,
}) {
  const sourceMetadata = await sharp(sourceFile).metadata();
  const physicalCrop = {
    left: Math.round(sourceCrop.x * environment.deviceScaleFactor),
    top: Math.round(sourceCrop.y * environment.deviceScaleFactor),
    width: Math.round(sourceCrop.width * environment.deviceScaleFactor),
    height: Math.round(sourceCrop.height * environment.deviceScaleFactor),
  };
  if (
    physicalCrop.left + physicalCrop.width > (sourceMetadata.width ?? 0)
    || physicalCrop.top + physicalCrop.height > (sourceMetadata.height ?? 0)
  ) {
    fail(`${path.basename(outputFile)} source crop exceeds its lossless master`);
  }
  await sharp(sourceFile)
    .extract(physicalCrop)
    .resize(output.width, output.height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(outputFile);
  const buffer = await readFile(outputFile);
  const metadata = await sharp(buffer).metadata();
  if (metadata.width !== output.width || metadata.height !== output.height || metadata.format !== 'webp') {
    fail(`${path.basename(outputFile)} encoded with unexpected dimensions or format`);
  }
  return {
    file: outputFile,
    sourceId,
    sourcePath,
    sourceMaster: path.relative(runDirectory, sourceFile),
    sourceCrop,
    physicalCrop,
    display,
    output,
    sha256: sha256(buffer),
    bytes: buffer.length,
  };
}

async function verifyCheckedProductProof(productProof) {
  for (const slot of productProof) {
    const checkedFile = path.join(root, 'public/product-proof', path.basename(slot.file));
    let checked;
    try {
      checked = await readFile(checkedFile);
    } catch {
      fail(`${path.relative(root, checkedFile)} is missing`);
      continue;
    }
    if (sha256(checked) !== slot.sha256) {
      fail(`${path.relative(root, checkedFile)} does not match the deterministic encoded candidate`);
    }
  }
  if (!failures.length) pass('checked landing slots match deterministic encoded candidates');
}

async function compareRuns() {
  const runA = path.join(outputRoot, 'run-a', 'capture-manifest.json');
  const runB = path.join(outputRoot, 'run-b', 'capture-manifest.json');
  const [manifestA, manifestB] = await Promise.all([
    readFile(runA, 'utf8').then(JSON.parse),
    readFile(runB, 'utf8').then(JSON.parse),
  ]);
  const comparableA = new Map(manifestA.routeEvidence
    .filter((entry) => entry.file)
    .map((entry) => [`${entry.id}:${entry.variant}`, entry]));
  for (const second of manifestB.routeEvidence.filter((entry) => entry.file)) {
    const first = comparableA.get(`${second.id}:${second.variant}`);
    if (!first) {
      fail(`run A is missing ${second.id}:${second.variant}`);
      continue;
    }
    const [firstImage, secondImage] = await Promise.all([
      sharp(path.join(outputRoot, 'run-a', first.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(path.join(outputRoot, 'run-b', second.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    if (firstImage.info.width !== secondImage.info.width || firstImage.info.height !== secondImage.info.height) {
      fail(`${second.id}:${second.variant} dimensions changed between clean runs`);
      continue;
    }
    const threshold = Math.round(environment.pixelDiff.channelThreshold * 255);
    let changed = 0;
    const pixels = firstImage.info.width * firstImage.info.height;
    for (let offset = 0; offset < firstImage.data.length; offset += firstImage.info.channels) {
      let pixelChanged = false;
      for (let channel = 0; channel < 3; channel += 1) {
        if (Math.abs(firstImage.data[offset + channel] - secondImage.data[offset + channel]) > threshold) {
          pixelChanged = true;
          break;
        }
      }
      if (pixelChanged) changed += 1;
    }
    const ratio = changed / pixels;
    if (ratio > environment.pixelDiff.maximumChangedPixelRatio) {
      fail(`${second.id}:${second.variant} changed ${(ratio * 100).toFixed(4)}% between clean runs`);
    }
  }
  const slotA = new Map(manifestA.productProof.map((slot) => [path.basename(slot.file), slot.sha256]));
  for (const slot of manifestB.productProof) {
    if (slotA.get(path.basename(slot.file)) !== slot.sha256) {
      fail(`${path.basename(slot.file)} encoded bytes differ between clean runs`);
    }
  }
  if (!failures.length) pass('second clean run is within the 0.1% pixel threshold');
}

function scorecardTemplate() {
  const ids = [
    ...LIVING_PRECISION_ROUTES
      .filter((entry) => entry.classification !== 'redirect')
      .map((entry) => entry.id),
    ...marketingCaptureIds,
  ];
  return {
    schemaVersion: 1,
    status: 'pending-independent-review',
    instructions: 'Score 0–4 per §14. Final verification requires every dimension ≥3, normal ≥89.5%, flagship/captures ≥95.8%, and two independent reviews for flagship/capture IDs.',
    privacyReview: { reviewerId: null, approved: false, notes: '' },
    benchmarkReview: { reviewerId: null, approved: false, notes: '' },
    engineeringReview: { reviewerId: null, approved: false, notes: '' },
    scorecards: ids.map((id) => ({
      id,
      reviewerId: null,
      dimensions: Object.fromEntries(SCORECARD_DIMENSIONS.map((dimension) => [dimension, null])),
      naRationales: {},
      p0p1Defects: [],
      notes: '',
    })),
  };
}

async function validateApprovedScorecards() {
  const configured = process.env[RELEASE_CAPTURE_ENV_KEYS.approvedScorecards];
  if (!configured) {
    fail(`${RELEASE_CAPTURE_ENV_KEYS.approvedScorecards} is required for independent Phase 28 review`);
    return null;
  }
  let review;
  try {
    review = JSON.parse(await readFile(path.resolve(root, configured), 'utf8'));
  } catch (error) {
    fail(`approved scorecards could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  for (const reviewName of ['privacyReview', 'benchmarkReview', 'engineeringReview']) {
    const approval = review[reviewName];
    if (!approval?.approved || !approval?.reviewerId || !approval?.notes?.trim()) {
      fail(`${reviewName} requires a named approval and evidence notes`);
    }
  }

  const routeById = new Map(LIVING_PRECISION_ROUTES.map((entry) => [entry.id, entry]));
  const requiredIds = [
    ...LIVING_PRECISION_ROUTES
      .filter((entry) => entry.classification !== 'redirect')
      .map((entry) => entry.id),
    ...marketingCaptureIds,
  ];
  const independentIds = new Set([
    ...FLAGSHIP_ROUTES.map((entry) => entry.id),
    ...marketingCandidateRouteIds,
    ...marketingCaptureIds,
  ]);
  const cards = Array.isArray(review.scorecards) ? review.scorecards : [];
  for (const id of requiredIds) {
    const matching = cards.filter((card) => card.id === id);
    const requiredReviews = independentIds.has(id) ? 2 : 1;
    if (new Set(matching.map((card) => card.reviewerId).filter(Boolean)).size < requiredReviews) {
      fail(`${id} requires ${requiredReviews} independent scorecard${requiredReviews === 1 ? '' : 's'}`);
      continue;
    }
    for (const card of matching) {
      if (Array.isArray(card.p0p1Defects) && card.p0p1Defects.length) {
        fail(`${id} has unresolved P0/P1 defects for reviewer ${card.reviewerId}`);
      }
      const values = [];
      for (const dimension of SCORECARD_DIMENSIONS) {
        const value = card.dimensions?.[dimension];
        if (value === null && dimension === 'dataStory') {
          const family = routeById.get(id)?.family;
          const allowedNa = ['entry', 'public-editorial', 'settings', 'settings-task', 'connector-setup', 'task', 'editorial-task'].includes(family);
          if (!allowedNa || !card.naRationales?.dataStory?.trim()) {
            fail(`${id} has an invalid or unexplained Data story N/A`);
          }
          continue;
        }
        if (!Number.isInteger(value) || value < 3 || value > 4) {
          fail(`${id} ${dimension} must be an integer from 3 to 4`);
          continue;
        }
        values.push(value);
      }
      const normalized = values.reduce((sum, value) => sum + value, 0) / (4 * values.length);
      const threshold = independentIds.has(id) ? 0.958 : 0.895;
      if (!Number.isFinite(normalized) || normalized < threshold) {
        fail(`${id} score ${(normalized * 100).toFixed(1)}% is below ${(threshold * 100).toFixed(1)}%`);
      }
    }
  }
  if (!failures.length) pass('scorecards, privacy, benchmark, and engineering reviews pass');
  return review;
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const packageVersion = packageJson.devDependencies['@playwright/test'].replace(/^[^\d]*/, '');
const installedPlaywright = JSON.parse(
  await readFile(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8'),
).version;
if (
  packageVersion !== environment.playwrightVersion
  || installedPlaywright !== environment.playwrightVersion
) {
  fail(`@playwright/test spec ${packageVersion} / installed ${installedPlaywright} does not match ${environment.container.image}`);
}
const suppliedDigest = process.env[RELEASE_CAPTURE_ENV_KEYS.containerDigest];
if (!allowHost && suppliedDigest !== environment.container.manifestDigest) {
  fail(`release capture requires ${RELEASE_CAPTURE_ENV_KEYS.containerDigest}=${environment.container.manifestDigest}`);
}
if (allowHost) {
  console.warn('NON-RELEASE: LIVING_PRECISION_ALLOW_HOST=1; host output cannot close the Phase 28 release gate.');
}
if (!developmentBaseUrl) {
  fail(`${RELEASE_CAPTURE_ENV_KEYS.developmentBaseUrl} is required for development-harness proofs`);
}
const appCommit =
  process.env[RELEASE_CAPTURE_ENV_KEYS.appCommit]
  ?? gitOutput(['rev-parse', 'HEAD']);
if (!appCommit || !/^[0-9a-f]{40}$/i.test(appCommit)) {
  fail(`${RELEASE_CAPTURE_ENV_KEYS.appCommit} must identify the exact 40-character source commit`);
}

if (failures.length) {
  process.exitCode = 1;
} else {
  await rm(runDirectory, { recursive: true, force: true });
  await Promise.all([
    mkdir(screenshotDirectory, { recursive: true }),
    mkdir(edgeDirectory, { recursive: true }),
    mkdir(flagshipDirectory, { recursive: true }),
    mkdir(candidateDirectory, { recursive: true }),
  ]);

  const fixture = buildMarketingFixture(environment.clock);
  const fixtureFingerprint = sha256(Buffer.from(JSON.stringify(fixture)));
  const browser = await chromium.launch({ headless: true });
  try {
    const contexts = {
      anonymous: await createContext(browser, environment.viewport),
      authenticated: await createContext(browser, environment.viewport),
      onboarding: await createContext(browser, environment.viewport),
    };
    await authenticate(contexts.authenticated, baseUrl, MARKETING_STORY.merchant.id);
    await authenticate(contexts.onboarding, baseUrl, MARKETING_STORY.onboarding.merchant.id);

    const primaryResults = new Map();
    for (const entry of LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'production')) {
      const result = await captureOne(
        contexts[entry.session],
        entry,
        baseUrl,
        entry.capturePath,
        screenshotDirectory,
      );
      primaryResults.set(entry.id, result);
    }
    for (const entry of LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'redirect')) {
      await proveRedirect(contexts[entry.session], entry);
    }
    for (const entry of LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'development')) {
      await verifyDevelopment404(contexts.authenticated, entry);
      if (developmentBaseUrl) {
        await authenticate(contexts.authenticated, developmentBaseUrl, MARKETING_STORY.merchant.id);
        await captureOne(
          contexts.authenticated,
          entry,
          developmentBaseUrl,
          entry.capturePath,
          screenshotDirectory,
          'development',
        );
      }
    }

    for (const entry of AUTHENTICATED_PAGE_FAMILY_EDGE_ROUTES) {
      const context = await createContext(browser, environment.edgeViewport);
      await authenticate(context, baseUrl, MARKETING_STORY.merchant.id);
      await captureOne(context, entry, baseUrl, entry.capturePath, edgeDirectory, '1024');
      await context.close();
    }

    for (const entry of FLAGSHIP_ROUTES) {
      for (const viewport of environment.flagshipViewports.slice(1)) {
        const context = await createContext(browser, viewport);
        if (entry.session === 'authenticated') await authenticate(context, baseUrl, MARKETING_STORY.merchant.id);
        await captureOne(
          context,
          entry,
          baseUrl,
          entry.capturePath,
          flagshipDirectory,
          `${viewport.width}x${viewport.height}`,
        );
        await context.close();
      }
      for (const variant of [
        { name: 'dark', colorScheme: 'dark' },
        { name: 'reduced-motion', reducedMotion: 'reduce' },
        { name: 'forced-colours', forcedColors: 'active' },
      ]) {
        const context = await createContext(browser, environment.viewport, variant);
        if (entry.session === 'authenticated') await authenticate(context, baseUrl, MARKETING_STORY.merchant.id);
        await captureOne(context, entry, baseUrl, entry.capturePath, flagshipDirectory, variant.name);
        await context.close();
      }
    }

    const recommendationContext = await createContext(browser, environment.viewport);
    const recommendationEntry = LIVING_PRECISION_ROUTES.find((entry) => entry.id === 'R55');
    const recommendation = await captureOne(
      recommendationContext,
      recommendationEntry,
      baseUrl,
      '/demo?step=recommendation',
      flagshipDirectory,
      'recommendation',
    );
    await recommendationContext.close();

    const evidenceSource = primaryResults.get('R55')?.file;
    let productProof = [];
    if (!evidenceSource || !recommendation.file) {
      fail('product-proof candidates require both successful R55 lossless masters');
    } else {
      productProof = [
        await encodeProductProof({
          sourceFile: evidenceSource,
          sourceId: 'R55',
          sourcePath: '/demo?step=evidence',
          outputFile: path.join(candidateDirectory, 'case-evidence.webp'),
          sourceCrop: { x: 96, y: 90, width: 1248, height: 780 },
          display: { width: 760, height: 475 },
          output: { width: 1520, height: 950 },
        }),
        await encodeProductProof({
          sourceFile: recommendation.file,
          sourceId: 'R55',
          sourcePath: '/demo?step=recommendation',
          outputFile: path.join(candidateDirectory, 'case-recommendation.webp'),
          sourceCrop: { x: 96, y: 120, width: 1248, height: 780 },
          display: { width: 620, height: 388 },
          output: { width: 1240, height: 776 },
        }),
      ].map((slot) => ({ ...slot, file: path.relative(runDirectory, slot.file) }));
      await verifyCheckedProductProof(productProof);
    }
    await writeFile(
      path.join(runDirectory, 'review-scorecards.template.json'),
      `${JSON.stringify(scorecardTemplate(), null, 2)}\n`,
      'utf8',
    );

    for (const context of Object.values(contexts)) await context.close();

    const dirtyStatus = gitOutput(['status', '--porcelain']);
    const manifest = {
      schemaVersion: 1,
      status: failures.length ? 'blocked' : allowHost ? 'host-evidence-only' : 'release-evidence',
      appCommit,
      dirtyWorktree: dirtyStatus === null ? null : Boolean(dirtyStatus),
      fixtureVersion: fixture.version,
      fixtureFingerprint,
      captureNow: environment.clock,
      locale: environment.locale,
      timezoneId: environment.timezoneId,
      viewport: environment.viewport,
      deviceScaleFactor: environment.deviceScaleFactor,
      browserVersion: browser.version(),
      container: {
        ...environment.container,
        suppliedDigest: suppliedDigest ?? null,
        hostOverride: allowHost,
      },
      routeEvidence,
      productProof,
      marketingCandidateSet: marketingCandidateRouteIds.map((id) => {
        const candidate = routeEvidence.find((entry) => entry.id === id && entry.variant === 'light');
        return {
          id,
          story: {
            R07: 'Immediate operational clarity and value trend',
            R02: 'Prioritised investigation workflow',
            R01: 'Evidence, reconciliation, and supervised decision',
            R16: 'Value movement and recovery state',
            R05: 'Unified customer, order, and case intelligence',
            R32: 'Analytical depth and drill-down',
            R30: 'Credible data coverage and freshness',
          }[id],
          file: candidate?.file ?? null,
          sha256: candidate?.sha256 ?? null,
        };
      }),
      failures,
    };
    await writeFile(
      path.join(runDirectory, 'capture-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    if (!failures.length && verifyMode) {
      await compareRuns();
      const approvedScorecards = failures.length
        ? null
        : await validateApprovedScorecards();
      if (approvedScorecards) {
        manifest.approvedReview = {
          sha256: sha256(Buffer.from(JSON.stringify(approvedScorecards))),
          reviewers: [...new Set(
            approvedScorecards.scorecards
              .map((card) => card.reviewerId)
              .filter(Boolean),
          )],
        };
      }
    }
    manifest.status = failures.length
      ? 'blocked'
      : allowHost
        ? 'host-evidence-only'
        : 'release-evidence';
    manifest.failures = [...failures];
    await writeFile(
      path.join(runDirectory, 'capture-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await browser.close();
  }
}

console.log(JSON.stringify({
  status: failures.length ? 'blocked' : allowHost ? 'host-evidence-only' : 'release-evidence',
  run: runName,
  failedChecks: failures.length,
  failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
