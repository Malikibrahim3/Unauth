#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runtimeSourceFingerprint } from './acceptance/local-runtime.mjs';

const require = createRequire(import.meta.url);
const { parse } = require('parse5');
const ts = require('typescript');

const root = resolve(process.cwd());
const archive = process.env.FULL_APP_VISUAL_AUTHORITY_ARCHIVE
  ?? '/Users/malikibrahim/Downloads/Cases page design directions.zip';
const expectedArchiveHash = '988c09688e0a02c9138307518c6504e647db5c3a2169081932aa1b747925d4aa';
const expectedShippingCount = 79;
const expectedBehaviouralCount = 4;
const errors = [];
const presentationFiles = [];
const competingImports = [];
const retiredMarkers = [];
const translationLayerConsumers = [];
const legacyPresentationTokens = [];
const incumbentIconImports = [];
const tailwindConsumers = [];
const inlineClassConsumers = [];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseAuthority() {
  const result = spawnSync('node_modules/.bin/ts-node', [
    '--transpile-only',
    '--compiler-options',
    '{"module":"commonjs","moduleResolution":"node"}',
    '-e',
    "const m=require('./lib/surfaces/manifest'); console.log(JSON.stringify({visualAuthorityPackage:m.visualAuthorityPackage,surfaceManifest:m.surfaceManifest,designReferenceCrosswalk:m.designReferenceCrosswalk,auditedSurfaceOwnership:m.auditedSurfaceOwnership,scenarioLedger:m.scenarioLedger}))",
  ], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    errors.push(`Could not evaluate executable visual authority: ${(result.stderr || result.stdout || '').trim()}`);
    return null;
  }
  const line = result.stdout.trim().split('\n').reverse().find((value) => value.startsWith('{'));
  try {
    return JSON.parse(line ?? '{}');
  } catch {
    errors.push('Could not parse executable visual authority output.');
    return null;
  }
}

function verifyGeneratedPages() {
  const result = spawnSync(process.execPath, ['scripts/generate-supplied-visual-pages.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    errors.push(`Mechanical TSX extraction is missing or stale: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value ?? null;
}

function walkTree(node, visitor) {
  visitor(node);
  for (const child of node.childNodes ?? []) walkTree(child, visitor);
}

function parseStyle(value) {
  return String(value ?? '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 0) return [declaration.toLowerCase(), ''];
      return [declaration.slice(0, separator).trim().toLowerCase(), declaration.slice(separator + 1).trim().replace(/\s+/g, ' ')];
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

function extractedStyle(value) {
  const removable = new Set(['width', 'flex', 'border-radius', 'box-shadow']);
  return parseStyle(value).filter(([property, propertyValue]) =>
    !removable.has(property) && !(property === 'height' && /^(?:960|820|900)px$/.test(propertyValue)),
  );
}

function nodeContract(node, isRoot = false) {
  if (node.nodeName === '#text') return ['text', String(node.value ?? '').replace(/\s+/g, ' ').trim()];
  if (node.nodeName === '#comment' || node.nodeName === '#documentType') return null;
  const attributes = (node.attrs ?? [])
    .filter(({ name }) => name !== 'src' && name !== 'href')
    .map(({ name, value }) => [name, name === 'style' && isRoot ? extractedStyle(value) : name === 'style' ? parseStyle(value) : value])
    .sort(([left], [right]) => left.localeCompare(right));
  return [
    node.nodeName,
    attributes,
    (node.childNodes ?? []).map((child) => nodeContract(child, false)).filter(Boolean),
  ];
}

function sourceContract(source, name) {
  const document = parse(source);
  const roots = [];
  walkTree(document, (node) => {
    if (attr(node, 'data-screen-label') !== null) roots.push(node);
  });
  if (roots.length !== 1) {
    errors.push(`${name} must contain exactly one [data-screen-label] root; found ${roots.length}.`);
    return null;
  }
  const rootNode = roots[0];
  const style = Object.fromEntries(parseStyle(attr(rootNode, 'style')));
  const width = Number.parseInt(style.width ?? '', 10);
  const height = Number.parseInt(style.height ?? '', 10);
  if (width !== 1440) errors.push(`${name} source root width is ${style.width ?? 'missing'}; expected 1440px.`);
  const fixedStyle = new Set(parseStyle(attr(rootNode, 'style')).map(([property]) => property));
  for (const property of ['width', 'flex', 'border-radius', 'box-shadow']) {
    if (!fixedStyle.has(property)) errors.push(`${name} source root is missing removable ${property} styling.`);
  }
  let elementCount = 0;
  let svgCount = 0;
  let interactiveCount = 0;
  let text = '';
  walkTree(rootNode, (node) => {
    if (node.nodeName?.startsWith('#')) {
      if (node.nodeName === '#text') text += ` ${String(node.value ?? '').replace(/\s+/g, ' ').trim()}`;
      return;
    }
    elementCount += 1;
    if (node.nodeName === 'svg') svgCount += 1;
    if (['a', 'button', 'input', 'select', 'textarea', 'summary'].includes(node.nodeName)) interactiveCount += 1;
  });
  const contract = nodeContract(rootNode, true);
  return {
    id: name.split('/').at(-1).replace(/\.dc\.html$/, ''),
    label: attr(rootNode, 'data-screen-label'),
    sourceMarkupFingerprint: sha256(JSON.stringify(contract)),
    sourceCopyFingerprint: sha256(text.replace(/\s+/g, ' ').trim()),
    elementCount,
    svgCount,
    interactiveCount,
    viewport: { width, height: Number.isFinite(height) ? height : null },
  };
}

function archivePage(name) {
  const result = spawnSync('unzip', ['-p', archive, name], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    errors.push(`Could not read ${name} from the visual authority archive: ${(result.stderr || result.stdout || '').trim()}`);
    return null;
  }
  return result.stdout;
}

function safeArtifactPath(value, label) {
  if (typeof value !== 'string' || !value) {
    errors.push(`${label} is missing.`);
    return null;
  }
  const candidate = resolve(root, value);
  const withinRoot = candidate === root || candidate.startsWith(`${root}/`);
  if (!withinRoot) {
    errors.push(`${label} escapes the repository: ${value}`);
    return null;
  }
  if (!existsSync(candidate)) {
    errors.push(`${label} does not exist: ${value}`);
    return null;
  }
  return candidate;
}

// A revision is a narrower comparison contract, never a blanket parity waiver.
// Original source screenshots/fingerprints and all unaffected checks still run.
export function visualRevisionErrors(reference, record, repositoryRoot = root) {
  const failures = [];
  const revision = reference.revision;
  const differences = record.intentionalVisualDifferences ?? [];
  if (!revision || revision.state !== 'implemented') {
    if (record.comparisonBaseline && record.comparisonBaseline !== 'original') failures.push('No implemented reference revision authorises this baseline.');
    if (differences.length) failures.push('Unregistered or merely planned visual differences cannot pass.');
    return failures;
  }
  const design = readFileSync(join(repositoryRoot, 'DESIGN.md'), 'utf8');
  const isRampLanding = reference.owner === '/landing' && revision.id === 'landing-ramp-2026-09-21';
  const planPath = isRampLanding
    ? 'docs/product/LANDING_PRODUCT_LED_IMPLEMENTATION.md'
    : 'docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md';
  const plan = readFileSync(join(repositoryRoot, planPath), 'utf8');
  const requirementPattern = isRampLanding ? /^RMP-0[0-6]$/ : /^(?:F\d{2}|C\d{3}|M\d{2})$/;
  const anchors = [...design.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim().toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-'));
  if (!revision.id || record.comparisonBaseline !== revision.id) failures.push('Comparison does not name its exact registered revision.');
  if (!revision.designAnchor || !anchors.includes(revision.designAnchor)) failures.push('Revision has no current DESIGN.md anchor.');
  if (!revision.expectation || !design.includes(revision.expectation)) failures.push('Revision expectation is not recorded in DESIGN.md.');
  if (!Array.isArray(revision.requirementIds) || !revision.requirementIds.length || revision.requirementIds.some((id) => !requirementPattern.test(id) || !plan.includes(id))) failures.push('Revision has missing or unknown requirement IDs.');
  for (const field of ['baselineEvidence', 'revisedReference']) {
    const target = typeof revision[field] === 'string' ? resolve(repositoryRoot, revision[field]) : '';
    if (!target.startsWith(`${repositoryRoot}/`) || !existsSync(target) || !statSync(target).isFile()) failures.push(`Revision ${field} must be a retained repository artifact.`);
  }
  const revisedPath = typeof revision.revisedReference === 'string' ? resolve(repositoryRoot, revision.revisedReference) : '';
  if (revisedPath.startsWith(`${repositoryRoot}/`) && existsSync(revisedPath) && statSync(revisedPath).isFile()) {
    const actualHash = sha256(readFileSync(revisedPath));
    if (actualHash !== revision.revisedReferenceSha256 || record.revisedReferenceSha256 !== actualHash) failures.push('Revised reference bytes do not match both registered and recorded hashes.');
  }
  if (record.equivalentInputs !== true || record.unaffectedSourceComparisonPassed !== true) failures.push('Revision lacks equivalent-input and unaffected-source comparisons.');
  if (differences.length !== 1 || differences[0] !== revision.expectation) failures.push('Recorded differences do not match the exact adopted expectation.');
  return failures;
}

function verifyParityReceipt(receiptPath, sourceContracts, authority) {
  if (!existsSync(receiptPath)) {
    errors.push(`Rendered source-vs-route parity receipt is missing: ${relative(root, receiptPath)}. Run the full 79-reference capture before acceptance.`);
    return;
  }
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  } catch {
    errors.push(`Rendered parity receipt is not valid JSON: ${relative(root, receiptPath)}.`);
    return;
  }
  if (receipt.archiveSha256 !== expectedArchiveHash) errors.push('Rendered parity receipt was produced from a different visual authority archive.');
  if (receipt.sourceComparison !== 'rendered-source-vs-canonical-route') errors.push('Rendered parity receipt does not declare rendered source-vs-canonical-route comparison.');
  if (receipt.fontAntialiasingOnlyTolerance !== true) errors.push('Rendered parity receipt does not limit pixel tolerance to browser font antialiasing.');
  const buildIdPath = join(root, '.next', 'BUILD_ID');
  if (!existsSync(buildIdPath) || receipt.buildId !== readFileSync(buildIdPath, 'utf8').trim()) errors.push('Rendered parity receipt does not match the current production build.');
  if (receipt.runtimeSourceFingerprint !== runtimeSourceFingerprint(root)) errors.push('Rendered parity receipt does not match current runtime file contents.');
  const buildReceiptPath = join(root, 'artifacts/full-app-acceptance-2026-08-30/build-environment.json');
  const buildReceipt = existsSync(buildReceiptPath) ? JSON.parse(readFileSync(buildReceiptPath, 'utf8')) : null;
  if (buildReceipt?.status !== 'passed' || buildReceipt?.sourceStable !== true || buildReceipt?.runtimeSourceFingerprint !== receipt.runtimeSourceFingerprint || buildReceipt?.buildId !== receipt.buildId) errors.push('Rendered parity is not backed by a stable, matching runtime-source build receipt.');
  const references = authority?.designReferenceCrosswalk ?? [];
  const shipping = references.filter((reference) => reference.kind === 'shipping');
  const records = Array.isArray(receipt.records) ? receipt.records : [];
  if (records.length !== expectedShippingCount) errors.push(`Rendered parity receipt must contain ${expectedShippingCount} page records; found ${records.length}.`);
  const recordById = new Map();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || recordById.has(record.id)) {
      errors.push(`Rendered parity receipt contains a missing or duplicate record id: ${record?.id ?? 'unknown'}.`);
      continue;
    }
    recordById.set(record.id, record);
  }
  for (const reference of shipping) {
    const contract = sourceContracts.get(reference.id);
    const record = recordById.get(reference.id);
    if (!record) {
      errors.push(`Rendered parity receipt is missing ${reference.id}.`);
      continue;
    }
    for (const failure of visualRevisionErrors(reference, record)) errors.push(`${reference.id}: ${failure}`);
    if (reference.revision?.state === 'implemented') {
      const revisedPath = safeArtifactPath(reference.revision.revisedReference, `${reference.id}.revisedReference`);
      if (revisedPath) {
        const revisedContract = sourceContract(readFileSync(revisedPath, 'utf8'), reference.id);
        if (record.revisedSourceMarkupFingerprint !== revisedContract?.sourceMarkupFingerprint) errors.push(`${reference.id} does not match its revised source contract.`);
      }
      for (const field of ['revisedSourceScreenshot', 'unaffectedSourceComparisonEvidence']) {
        const file = safeArtifactPath(record[field], `${reference.id}.${field}`);
        if (file && readFileSync(file).subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push(`${reference.id}.${field} is not a PNG.`);
      }
    }
    if (record.canonicalRoute !== reference.owner && record.canonicalRoute !== reference.owner.replace(/\[.+?\]/g, ':id')) {
      errors.push(`${reference.id} parity route is ${record.canonicalRoute ?? 'missing'}; expected ${reference.owner}.`);
    }
    if (typeof record.activatedUrl !== 'string' || /__visual_reference|__visual=source-state/.test(record.activatedUrl)) {
      errors.push(`${reference.id} parity did not exercise the normal canonical runtime route.`);
    }
    if (record.sourceMarkupFingerprint !== contract?.sourceMarkupFingerprint) errors.push(`${reference.id} source markup fingerprint does not match the archive root after the permitted wrapper extraction.`);
    for (const field of ['implementationMarkupFingerprint', 'implementationCopyFingerprint', 'iconSignature', 'geometry', 'controlCount', 'navigationGrouping', 'browserViewport']) {
      if (record[field] === undefined) errors.push(`${reference.id} parity record is missing ${field}.`);
    }
    const referenceViewport = record.browserViewport?.source;
    const runtimeViewport = record.browserViewport?.implementation;
    if (!referenceViewport || !runtimeViewport || referenceViewport.width !== runtimeViewport.width || referenceViewport.height !== runtimeViewport.height) {
      errors.push(`${reference.id} was not compared at an identical recorded browser viewport.`);
    }
    for (const field of ['sourceScreenshot', 'implementationScreenshot']) {
      const file = safeArtifactPath(record[field], `${reference.id}.${field}`);
      if (!file) continue;
      const bytes = readFileSync(file);
      if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push(`${reference.id}.${field} is not a PNG.`);
    }
    if (record.navigationTargetsValid !== true || !Array.isArray(record.unresolvedNavigationTargets) || record.unresolvedNavigationTargets.length) errors.push(`${reference.id} lacks proof that rendered navigation is free of source-file and placeholder targets.`);
    if (record.structureMatch !== true || record.copyMatch !== true || record.iconMatch !== true || record.geometryMatch !== true || record.controlCountMatch !== true || record.navigationGroupingMatch !== true) {
      errors.push(`${reference.id} has a failed structure/copy/icon/geometry/control/navigation comparison.`);
    }
    if (!record.pixelComparison || record.pixelComparison.fontAntialiasingOnly !== true || !Number.isInteger(record.pixelComparison.differingPixels) || !Number.isInteger(record.pixelComparison.allowedPixels) || record.pixelComparison.differingPixels > record.pixelComparison.allowedPixels) {
      errors.push(`${reference.id} does not provide an acceptable pixel comparison.`);
    }
    if (!Array.isArray(record.verifiedStates) || !Array.isArray(record.verifiedOverlays) || !Array.isArray(record.verifiedPermissionSurfaces)) errors.push(`${reference.id} is missing state, overlay, or permission-surface verification.`);
  }
  const expectedSurfaceIds = new Set((authority?.auditedSurfaceOwnership ?? []).map((surface) => surface.id));
  const expectedScenarioIds = new Set((authority?.scenarioLedger ?? []).map((scenario) => scenario.id));
  const comparedScenarios = new Map((receipt.scenarioComparisons ?? []).map((comparison) => [comparison.scenarioId, comparison]));
  for (const id of expectedScenarioIds) {
    const comparison = comparedScenarios.get(id);
    if (!comparison || comparison.referenceComparisonPassed !== true || !recordById.has(comparison.referenceId)) {
      errors.push(`Scenario ${id} lacks its own rendered reference comparison; functional ledger counts are not visual evidence.`);
    }
  }
  const receiptSurfaceIds = new Set(Array.isArray(receipt.verifiedSurfaceIds) ? receipt.verifiedSurfaceIds : []);
  const receiptScenarioIds = new Set(Array.isArray(receipt.verifiedScenarioIds) ? receipt.verifiedScenarioIds : []);
  for (const id of expectedSurfaceIds) if (!receiptSurfaceIds.has(id)) errors.push(`Rendered parity receipt does not verify audited surface ${id}.`);
  for (const id of expectedScenarioIds) if (!receiptScenarioIds.has(id)) errors.push(`Rendered parity receipt does not verify scenario ${id}.`);
  if (receiptSurfaceIds.size !== expectedSurfaceIds.size) errors.push(`Rendered parity receipt surface coverage is ${receiptSurfaceIds.size}; expected ${expectedSurfaceIds.size}.`);
  if (receiptScenarioIds.size !== expectedScenarioIds.size) errors.push(`Rendered parity receipt scenario coverage is ${receiptScenarioIds.size}; expected ${expectedScenarioIds.size}.`);
}

const localSourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];

function isFile(value) {
  return existsSync(value) && statSync(value).isFile();
}

function resolveLocalImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier);
  else return null;

  const candidates = [base];
  for (const extension of localSourceExtensions) candidates.push(`${base}${extension}`);
  for (const extension of localSourceExtensions) candidates.push(join(base, `index${extension}`));
  const resolved = candidates.find(isFile) ?? null;
  if (!resolved) return null;
  const rel = relative(root, resolved);
  if (rel.startsWith('..')) return null;
  return resolved;
}

function localImports(file, source, requestedExports) {
  if (extname(file) === '.css') {
    const imports = [];
    for (const match of source.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g)) {
      imports.push({ specifier: match[1], names: '*' });
    }
    return imports;
  }
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];

  function importNames(importClause) {
    if (!importClause) return '*';
    if (importClause.isTypeOnly) return [];
    const names = [];
    if (importClause.name) names.push('default');
    if (importClause.namedBindings) {
      if (ts.isNamespaceImport(importClause.namedBindings)) return '*';
      for (const element of importClause.namedBindings.elements) {
        if (!element.isTypeOnly) names.push((element.propertyName ?? element.name).text);
      }
    }
    return names;
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const names = importNames(node.importClause);
      if (names === '*' || names.length) imports.push({ specifier: node.moduleSpecifier.text, names });
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      if (!node.exportClause) {
        imports.push({ specifier: node.moduleSpecifier.text, names: requestedExports });
      } else if (ts.isNamespaceExport(node.exportClause)) {
        const exported = node.exportClause.name.text;
        if (requestedExports === '*' || requestedExports.has(exported)) {
          imports.push({ specifier: node.moduleSpecifier.text, names: '*' });
        }
      } else {
        const names = [];
        for (const element of node.exportClause.elements) {
          if (element.isTypeOnly) continue;
          const exported = element.name.text;
          if (requestedExports === '*' || requestedExports.has(exported)) {
            names.push((element.propertyName ?? element.name).text);
          }
        }
        if (names.length) imports.push({ specifier: node.moduleSpecifier.text, names });
      }
    }
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        imports.push({ specifier: node.arguments[0].text, names: '*' });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return imports;
}

function collectAppEntrypoints(directory, entries = []) {
  if (!existsSync(directory)) return entries;
  const nextEntrypoint = /^(?:page|layout|template|loading|error|not-found|global-error|default)\.(?:ts|tsx|js|jsx)$/;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) collectAppEntrypoints(full, entries);
    else if (nextEntrypoint.test(entry.name)) entries.push(full);
  }
  return entries;
}

function collectShippingRenderGraph(entrypoints = collectAppEntrypoints(join(root, 'app'))) {
  const pending = [];
  const requested = new Map();

  function enqueue(file, names) {
    const previous = requested.get(file);
    if (previous === '*') return;
    if (names === '*') {
      requested.set(file, '*');
      pending.push(file);
      return;
    }
    const merged = new Set(previous ?? []);
    const before = merged.size;
    for (const name of names) merged.add(name);
    if (before !== merged.size || previous === undefined) {
      requested.set(file, merged);
      pending.push(file);
    }
  }

  for (const entrypoint of entrypoints) enqueue(entrypoint, '*');
  while (pending.length) {
    const file = pending.pop();
    if (!file || !isFile(file)) continue;
    const source = readFileSync(file, 'utf8');
    for (const dependency of localImports(file, source, requested.get(file) ?? '*')) {
      const imported = resolveLocalImport(file, dependency.specifier);
      if (imported) enqueue(imported, dependency.names);
    }
  }
  return [...requested.keys()].sort();
}

function scanShippingFiles(files) {
  for (const full of files) {
    const rel = relative(root, full);
    // DESIGN.md's owner-adopted Linear landing replacement has one scoped
    // stylesheet. Every other route retains the supplied inline-style contract.
    const landingStyles = rel === 'app/(public)/landing/landing.module.css';
    if (full.endsWith('.module.css') && !landingStyles) presentationFiles.push(rel);
    if (!localSourceExtensions.includes(extname(full))) continue;
    const source = readFileSync(full, 'utf8');
    if (/sourcePageOverrideUsesSourceBody|ACCEPTANCE_VISUAL_SOURCES|__visual[^\n]*source-state|sourceState[^\n]*return value/.test(source)) {
      errors.push(`Static reference-body or example-value bypass remains in shipping code: ${rel}`);
    }
    if (/styles\/operations\/index\.css|styles\/evidence-operations\.css/.test(source)) competingImports.push(rel);
    if (/evidence-operations-v1|dashboardPilot|Challenge[0-9]|data-auth-theme|ua-auth-card|full-app-visual-authority|decision-ledger-instrument-grade/.test(source)) retiredMarkers.push(rel);
    if (/visualAuthorityStyles|full-app-visual-authority\.css/.test(source)) translationLayerConsumers.push(rel);
    if (/--uo-|className\s*=\s*(?:["'`{][^\n]*\b(?:ua|uo)-)|\.(?:ua|uo)-[a-z]/.test(source)) legacyPresentationTokens.push(rel);
    if (/from\s+['"]lucide-react['"]|require\(['"]lucide-react['"]\)/.test(source)) incumbentIconImports.push(rel);
    if (/@import\s+['"]tailwindcss['"]|@tailwind\s+(?:base|components|utilities)/.test(source)) tailwindConsumers.push(rel);
    const withoutAccessibilityOnlyClass = source.replace(/className\s*=\s*['"]sr-only['"]/g, '');
    const adoptedLandingPage = rel === 'app/(public)/landing/page.tsx'
      && source.includes('data-visual-revision="linear-landing-2026-09-07"');
    if (/className\s*=/.test(withoutAccessibilityOnlyClass) && !adoptedLandingPage) inlineClassConsumers.push(rel);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
if (!existsSync(archive)) {
  errors.push(`Missing finished visual authority archive: ${archive}`);
} else {
  const actual = sha256(readFileSync(archive));
  if (actual !== expectedArchiveHash) errors.push(`Visual authority archive checksum mismatch: ${actual}`);
}

const authority = parseAuthority();
verifyGeneratedPages();
const sourceContracts = new Map();
if (existsSync(archive)) {
  const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
  if (listing.status !== 0) errors.push(`Could not list visual authority archive: ${(listing.stderr || listing.stdout || '').trim()}`);
  else {
    const names = listing.stdout.split('\n').filter(Boolean);
    const shippingPages = names.filter((name) => /^handoff\/pages\/[^/]+-Clean\.dc\.html$/.test(name));
    const behaviouralPages = names.filter((name) => /^handoff\/reference\/[^/]+\.dc\.html$/.test(name));
    if (shippingPages.length !== expectedShippingCount) errors.push(`Expected ${expectedShippingCount} finished shipping pages; found ${shippingPages.length}.`);
    if (behaviouralPages.length !== expectedBehaviouralCount) errors.push(`Expected ${expectedBehaviouralCount} behavioural references; found ${behaviouralPages.length}.`);
    for (const name of shippingPages) {
      const contract = sourceContract(archivePage(name) ?? '', name);
      if (contract) sourceContracts.set(contract.id, contract);
    }
  }
}

if (authority) {
  if (authority.visualAuthorityPackage?.archiveSha256 !== expectedArchiveHash) errors.push('Executable manifest visual authority checksum does not match the supplied package.');
  if (authority.visualAuthorityPackage?.shippingPageCount !== expectedShippingCount || authority.visualAuthorityPackage?.behaviouralReferenceCount !== expectedBehaviouralCount) errors.push('Executable manifest visual authority counts do not match the supplied package.');
  const shipping = (authority.designReferenceCrosswalk ?? []).filter((reference) => reference.kind === 'shipping');
  if (shipping.length !== expectedShippingCount) errors.push(`Executable crosswalk contains ${shipping.length} shipping references; expected ${expectedShippingCount}.`);
  for (const reference of shipping) {
    if (!sourceContracts.has(reference.id)) errors.push(`Crosswalk reference ${reference.id} has no source page in the archive.`);
    if (!reference.owner.startsWith('shared:') && !(authority.surfaceManifest ?? []).some((entry) => entry.pathPattern === reference.owner && entry.referenceIds.includes(reference.id))) {
      errors.push(`Crosswalk reference ${reference.id} is not attached to its canonical manifest owner ${reference.owner}.`);
    }
  }
}

const shippingRenderGraph = collectShippingRenderGraph();
scanShippingFiles(shippingRenderGraph);
if (process.env.FULL_APP_VISUAL_GRAPH_SUMMARY === '1') {
  console.log(`Shipping visual render graph: ${shippingRenderGraph.length} local modules.`);
}
if (process.env.FULL_APP_VISUAL_GRAPH_BY_ROUTE === '1') {
  const pageEntrypoints = collectAppEntrypoints(join(root, 'app'))
    .filter((file) => /\/page\.(?:ts|tsx|js|jsx)$/.test(file));
  const rows = pageEntrypoints.map((entrypoint) => {
    const graph = collectShippingRenderGraph([entrypoint]);
    const lucide = graph.filter((file) => /from\s+['"]lucide-react['"]|require\(['"]lucide-react['"]\)/.test(readFileSync(file, 'utf8')));
    const classes = graph.filter((file) => {
      const source = readFileSync(file, 'utf8').replace(/className\s*=\s*['"]sr-only['"]/g, '');
      return /className\s*=/.test(source);
    });
    return {
      routeEntry: relative(root, entrypoint),
      modules: graph.length,
      lucide: lucide.length,
      classes: classes.length,
    };
  }).sort((left, right) => (right.lucide + right.classes) - (left.lucide + left.classes));
  console.log(JSON.stringify(rows, null, 2));
}
if (process.env.FULL_APP_VISUAL_GRAPH_FILES) {
  const match = process.env.FULL_APP_VISUAL_GRAPH_FILES;
  const entrypoint = collectAppEntrypoints(join(root, 'app')).find((file) => relative(root, file).includes(match));
  if (!entrypoint) {
    errors.push(`Could not find render-graph entrypoint matching ${match}.`);
  } else {
    const graph = collectShippingRenderGraph([entrypoint]);
    const owners = graph.filter((file) => {
      const source = readFileSync(file, 'utf8').replace(/className\s*=\s*['"]sr-only['"]/g, '');
      return /className\s*=/.test(source) || /from\s+['"]lucide-react['"]|require\(['"]lucide-react['"]\)/.test(source);
    });
    console.log(JSON.stringify({
      routeEntry: relative(root, entrypoint),
      competingOwners: owners.map((file) => relative(root, file)),
    }, null, 2));
  }
}
if (presentationFiles.length) errors.push(`Competing CSS-module presentation remains (${presentationFiles.length}): ${presentationFiles.join(', ')}`);
if (competingImports.length) errors.push(`Competing operations cascade imports remain (${competingImports.length}): ${competingImports.join(', ')}`);
if (retiredMarkers.length) errors.push(`Retired presentation markers remain (${retiredMarkers.length}): ${retiredMarkers.join(', ')}`);
if (translationLayerConsumers.length) errors.push(`Legacy CSS translation layer remains (${translationLayerConsumers.length}): ${translationLayerConsumers.join(', ')}`);
if (legacyPresentationTokens.length) errors.push(`Legacy ua/uo presentation tokens remain (${legacyPresentationTokens.length}): ${legacyPresentationTokens.join(', ')}`);
if (incumbentIconImports.length) errors.push(`Incumbent Lucide icon imports remain in the shipping source tree (${incumbentIconImports.length}): ${incumbentIconImports.join(', ')}`);
if (tailwindConsumers.length) errors.push(`Tailwind presentation remains in the shipping source tree (${tailwindConsumers.length}): ${tailwindConsumers.join(', ')}`);
if (inlineClassConsumers.length) errors.push(`Class-based presentation remains where the supplied pages require inline styles (${inlineClassConsumers.length}): ${inlineClassConsumers.join(', ')}`);

verifyParityReceipt(
  resolve(root, process.env.FULL_APP_VISUAL_PARITY_RECEIPT ?? 'artifacts/visual-authority/reference-parity.json'),
  sourceContracts,
  authority,
);

if (errors.length) {
  console.error(`Full-app visual cutover is incomplete (${errors.length} gate${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS full-app visual cutover: ${expectedShippingCount} supplied pages and ${expectedBehaviouralCount} behavioural references have source, route, structure, state, and rendered pixel evidence.`);
}
