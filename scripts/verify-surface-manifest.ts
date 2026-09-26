import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { globSync } from 'glob';
import {
  adapterDispositions,
  auditedSurfaceOwnership,
  implementationAuthority,
  merchantClarityCoverage,
  scenarioLedger,
  designReferenceCrosswalk,
  specificationAuthorities,
  visualAuthorityPackage,
  sharedSurfaceFamilies,
  specializedGapDispositions,
  surfaceManifest,
  SURFACE_MANIFEST_EXPECTED_AUDITED_SURFACE_COUNT,
  SURFACE_MANIFEST_EXPECTED_ADAPTER_SCENARIO_COUNT,
  SURFACE_MANIFEST_EXPECTED_PAGE_COUNT,
  SURFACE_MANIFEST_EXPECTED_PHASE_COUNTS,
  SURFACE_MANIFEST_EXPECTED_SCENARIO_COUNT,
  SURFACE_MANIFEST_EXPECTED_VISUAL_SCENARIO_COUNT,
  visualDispositionBySurfaceId,
} from '../lib/surfaces/manifest';

// CommonJS is intentional: aliases.js is also consumed by next.config.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LEGACY_UI_REDIRECTS } = require('../lib/navigation/aliases.js') as {
  LEGACY_UI_REDIRECTS: ReadonlyArray<{
    source: string;
    destination: string;
    permanent: boolean;
  }>;
};

const repositoryRoot = resolve(__dirname, '..');
const errors: string[] = [];

if (
  specificationAuthorities.architectureIndex !== 'ARCHITECTURE.md' ||
  specificationAuthorities.globalRules !== 'GLOBAL_RULES.md' ||
  specificationAuthorities.currentExecution !== 'docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md' ||
  specificationAuthorities.productTruth !== 'PRODUCT.md' ||
  specificationAuthorities.executableSurfaceMap !== 'lib/surfaces/manifest.ts' ||
  specificationAuthorities.canonicalNavigation !== 'lib/navigation/appRoutes.ts' ||
  specificationAuthorities.legacyRedirects !== 'lib/navigation/aliases.js' ||
  specificationAuthorities.redirectConsumer !== 'next.config.js' ||
  specificationAuthorities.visualSystem !== 'DESIGN.md' ||
  specificationAuthorities.humanReadableInventory !== 'docs/page-inventory.md'
) {
  errors.push('The executable authority registry no longer matches ARCHITECTURE.md.');
}

if (
  visualAuthorityPackage.archivePath !== '/Users/malikibrahim/Downloads/Cases page design directions.zip' ||
  visualAuthorityPackage.archiveSha256 !== '988c09688e0a02c9138307518c6504e647db5c3a2169081932aa1b747925d4aa' ||
  visualAuthorityPackage.shippingPageCount !== 79 ||
  visualAuthorityPackage.behaviouralReferenceCount !== 4 ||
  visualAuthorityPackage.sourceSelector !== '[data-screen-label]' ||
  visualAuthorityPackage.discardOnly !== 'outer screenshot/stage wrapper and its 26px padding'
) {
  errors.push('The executable visual authority package record no longer matches the supplied ZIP contract.');
}

const supersededPresentationPaths = [
  'styles/authenticated/tokens.css',
  'styles/authenticated/foundations.css',
  'styles/authenticated/controls.css',
  'styles/authenticated/surfaces.css',
  'styles/authenticated/tables.css',
  'styles/authenticated/states.css',
  'styles/authenticated/status.css',
  'styles/authenticated/overlays.css',
  'styles/authenticated/responsive.css',
  'styles/authenticated/typography.css',
  'styles/authenticated/composition.css',
  'styles/authenticated/instrument.css',
  'components/ui/badgeStyles.ts',
  'components/ui/buttonStyles.ts',
  'components/layout/CommandPaletteInputBar.tsx',
  'components/layout/CommandPaletteResultsList.tsx',
  'components/imports/CanonicalCsvImportClient.module.css',
] as const;

if (
  implementationAuthority.presentationDisposition !== 'preserve-supplied-with-registered-revisions' ||
  implementationAuthority.componentNamesAre !== 'reachable-owners-not-runtime-acceptance'
) {
  errors.push('The manifest no longer preserves the supplied system with registered revisions under GLOBAL_RULES.md.');
}

for (const requiredStrategy of [
  'parallel-legacy-component-family',
  'legacy-style-or-token-fallback',
  'unregistered-visual-revision',
  'blanket-runtime-text-replacement',
] as const) {
  if (!implementationAuthority.prohibitedStrategies.includes(requiredStrategy)) {
    errors.push(`The replacement authority no longer prohibits ${requiredStrategy}.`);
  }
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function compareSets(label: string, expected: readonly string[], actual: readonly string[]) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value)).sort();
  const extra = [...actualSet].filter((value) => !expectedSet.has(value)).sort();
  if (missing.length || extra.length) {
    errors.push(`${label} differs. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`);
  }
}

const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const;

function resolveLocalModule(importer: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(repositoryRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(importer), specifier)
      : null;
  if (!base) return null;
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => resolve(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => existsSync(candidate) && sourceExtensions.some((extension) => candidate.endsWith(extension))) ?? null;
}

function reachableSource(repositoryRelativeEntry: string): string {
  const queue = [resolve(repositoryRoot, repositoryRelativeEntry)];
  const seen = new Set<string>();
  const sources: string[] = [];
  const importPatterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  while (queue.length > 0) {
    const sourcePath = queue.shift();
    if (!sourcePath || seen.has(sourcePath) || !existsSync(sourcePath)) continue;
    seen.add(sourcePath);
    const source = readFileSync(sourcePath, 'utf8');
    sources.push(source);
    for (const pattern of importPatterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const dependency = resolveLocalModule(sourcePath, match[1] ?? '');
        if (dependency && !seen.has(dependency)) queue.push(dependency);
      }
    }
  }
  return sources.join('\n');
}

if (surfaceManifest.length !== SURFACE_MANIFEST_EXPECTED_PAGE_COUNT) {
  errors.push(`Expected ${SURFACE_MANIFEST_EXPECTED_PAGE_COUNT} manifest entries; found ${surfaceManifest.length}.`);
}

const allowedShells = new Set([
  'PublicShell',
  'AuthShell',
  'OnboardingShell',
  'AppShell',
  'DetailShell',
  'WorkbenchShell',
  'SettingsShell',
]);

for (const entry of surfaceManifest) {
  if (!allowedShells.has(entry.shell)) {
    errors.push(`Manifest entry ${entry.id} has an unknown shell: ${entry.shell}.`);
  }
  if (!/^P(?:[1-9]|1[0-2])(?:\/P(?:[1-9]|1[0-2]))*$/.test(entry.archetype)) {
    errors.push(`Manifest entry ${entry.id} has an invalid archetype: ${entry.archetype}.`);
  }
  if (!entry.primaryComponents.length) {
    errors.push(`Manifest entry ${entry.id} has no primary component owner.`);
  }
  const pageSource = readFileSync(resolve(repositoryRoot, entry.pageModule), 'utf8');
  const activeRenderer = entry.primaryComponents[0];
  const escapedRenderer = activeRenderer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rendererUse = new RegExp(
    `(?:<\\s*${escapedRenderer}\\b|\\b${escapedRenderer}\\s*\\(|\\bsource\\s*=\\s*\\{\\s*${escapedRenderer}\\s*\\}|from\\s+['\"][^'\"]*${escapedRenderer}['\"])`,
  );
  const reachable = reachableSource(entry.pageModule);
  if (!rendererUse.test(pageSource) && !rendererUse.test(reachable)) {
    errors.push(
      `Manifest entry ${entry.id} names ${activeRenderer} as its active renderer, but the reachable render graph rooted at ${entry.pageModule} does not render or invoke it.`,
    );
  }
  for (const component of entry.primaryComponents) {
    const escapedComponent = component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${escapedComponent}\\b`).test(reachable)) {
      errors.push(
        `Manifest entry ${entry.id} names dormant or unreachable renderer ${component}; it is absent from the active import graph rooted at ${entry.pageModule}.`,
      );
    }
  }
  if (entry.maturity !== 'adapter' && !entry.dataDependencies.length) {
    errors.push(`Non-adapter manifest entry ${entry.id} has no data dependency recorded.`);
  }
  for (const [label, values] of [
    ['primary components', entry.primaryComponents],
    ['data dependencies', entry.dataDependencies],
    ['owned states', entry.ownedStates],
    ['owned overlays', entry.ownedOverlays],
    ['query state', entry.queryState],
    ['legacy aliases', entry.legacyAliases],
  ] as const) {
    const duplicates = duplicateValues(values);
    if (duplicates.length) {
      errors.push(`Manifest entry ${entry.id} has duplicate ${label}: ${duplicates.join(', ')}.`);
    }
  }
}

const phaseCounts = surfaceManifest.reduce<Record<string, number>>((counts, entry) => {
  counts[entry.phase] = (counts[entry.phase] ?? 0) + 1;
  return counts;
}, {});
for (const [phase, expectedCount] of Object.entries(SURFACE_MANIFEST_EXPECTED_PHASE_COUNTS)) {
  const actualCount = phaseCounts[phase] ?? 0;
  if (actualCount !== expectedCount) {
    errors.push(`Expected ${expectedCount} ${phase.toUpperCase()} page owners; found ${actualCount}.`);
  }
}

const actualPageModules = globSync('app/**/page.tsx', { cwd: repositoryRoot }).sort();
const manifestPageModules = surfaceManifest.map((entry) => entry.pageModule).sort();
compareSets('Concrete page modules', actualPageModules, manifestPageModules);

for (const [label, values] of [
  ['manifest IDs', surfaceManifest.map((entry) => entry.id)],
  ['manifest path patterns', surfaceManifest.map((entry) => entry.pathPattern)],
  ['manifest page modules', manifestPageModules],
] as const) {
  const duplicates = duplicateValues(values);
  if (duplicates.length) errors.push(`Duplicate ${label}: ${duplicates.join(', ')}.`);
}

if (auditedSurfaceOwnership.length !== SURFACE_MANIFEST_EXPECTED_AUDITED_SURFACE_COUNT) {
  errors.push(
    `Expected ${SURFACE_MANIFEST_EXPECTED_AUDITED_SURFACE_COUNT} audited surfaces; found ${auditedSurfaceOwnership.length}.`,
  );
}

const scenarioIds = scenarioLedger.map((scenario) => scenario.id);
const planSource = readFileSync(resolve(repositoryRoot, specificationAuthorities.currentExecution), 'utf8');
const requiredRequirementIds = [
  ...[...planSource.matchAll(/^\| (F\d{2}|M\d{2}) \|/gm)].map((match) => match[1]),
  ...[...planSource.matchAll(/^- \[[ x]\] (C\d{3}) /gm)].map((match) => match[1]),
];
const projectedRequirementIds = merchantClarityCoverage.flatMap((group) => [...group.requirementIds]);
compareSets('Merchant clarity F/C/M requirement projection', requiredRequirementIds, projectedRequirementIds);
const duplicateRequirements = duplicateValues(projectedRequirementIds);
if (duplicateRequirements.length) errors.push(`Repeated requirement ownership: ${duplicateRequirements.join(', ')}.`);
for (const group of merchantClarityCoverage) {
  if (!group.scenarioIds.length) errors.push(`Unmapped requirement group: ${group.requirementIds.join(', ')}.`);
  for (const id of group.scenarioIds) {
    if (id !== '*' && !scenarioIds.includes(id)) errors.push(`Requirement projection refers to unknown scenario ${id}.`);
  }
}
for (const scenario of scenarioLedger) {
  if (!surfaceManifest.some((entry) => entry.pageModule === scenario.pageModule) && !scenario.owner.startsWith('shared:')) {
    errors.push(`Scenario ${scenario.id} has no current page owner.`);
  }
}
const duplicateScenarioIds = duplicateValues(scenarioIds);
if (duplicateScenarioIds.length) errors.push(`Duplicate scenario IDs: ${duplicateScenarioIds.join(', ')}.`);
if (scenarioLedger.length !== SURFACE_MANIFEST_EXPECTED_SCENARIO_COUNT) {
  errors.push(`Expected ${SURFACE_MANIFEST_EXPECTED_SCENARIO_COUNT} comprehensive scenarios; found ${scenarioLedger.length}.`);
}
const visualScenarioCount = scenarioLedger.filter((scenario) => scenario.disposition === 'replace').length;
const adapterScenarioCount = scenarioLedger.filter((scenario) => scenario.disposition === 'adapter').length;
if (visualScenarioCount !== SURFACE_MANIFEST_EXPECTED_VISUAL_SCENARIO_COUNT) {
  errors.push(`Expected ${SURFACE_MANIFEST_EXPECTED_VISUAL_SCENARIO_COUNT} visual scenarios; found ${visualScenarioCount}.`);
}
if (adapterScenarioCount !== SURFACE_MANIFEST_EXPECTED_ADAPTER_SCENARIO_COUNT) {
  errors.push(`Expected ${SURFACE_MANIFEST_EXPECTED_ADAPTER_SCENARIO_COUNT} adapter scenarios; found ${adapterScenarioCount}.`);
}

const expectedShippingReferenceIds = [
  'Landing-Clean', 'Pricing-Clean', 'Demo-Context-Clean', 'Demo-Sources-Clean', 'Demo-Clean',
  'Demo-Decision-Clean', 'Demo-Recovery-Clean', 'Legal-Privacy-Clean', 'Legal-Data-Handling-Clean',
  'Legal-DPA-Clean', 'Legal-Pilot-Terms-Clean', 'Root-Not-Found-Clean', 'Login-Clean', 'Signup-Clean',
  'Reset-Clean', 'Reset-Update-Clean', 'Onboarding-Store-Clean', 'Onboarding-Commerce-Clean',
  'Onboarding-Helpdesk-Clean', 'Onboarding-Ready-Clean', 'First-Run-Clean', 'Overview-Clean', 'Work-Clean',
  'Cases-Clean', 'Case-Review-Clean', 'Customers-Clean', 'Customer-Detail-Clean', 'Evidence-Package-Clean',
  'Order-Detail-Clean', 'Refund-Detail-Clean', 'Return-Detail-Clean', 'Shipment-Detail-Clean', 'Ticket-Detail-Clean',
  'Dispute-Detail-Clean', 'Loss-Ledger-Clean', 'Loss-Detail-Clean', 'Write-Off-Clean', 'Recovery-Board-Clean',
  'Recovery-Detail-Clean', 'File-Claim-Clean', 'Reconciliation-Clean', 'Reports-Clean', 'Named-Report-Clean',
  'Report-Records-Clean', 'Period-Close-Clean', 'Payout-Rules-Clean', 'Rule-Editor-Clean', 'Recovery-Rulebook-Clean',
  'Flows-Clean', 'Flow-Runs-Clean', 'Flow-Run-Detail-Clean', 'Connected-Sources-Clean', 'Source-Detail-Clean',
  'Source-Repair-Clean', 'Provider-Catalogue-Clean', 'Provider-Setup-Clean', 'Channel-Select-Clean', 'Imports-Clean',
  'Import-Job-Detail-Clean', 'Mapping-Repair-Clean', 'Settings-Clean', 'Account-Settings-Clean', 'Team-Clean',
  'Audit-Log-Clean', 'Data-Privacy-Clean', 'Agreements-Clean', 'API-Access-Clean', 'Billing-Clean', 'Notifications-Clean',
  'Search-Clean', 'Command-Palette-Clean', 'Help-Clean', 'Help-Article-Clean', 'Loading-Registry-Clean',
  'Loading-Detail-Clean', 'Not-Found-Clean', 'Route-Error-Clean', 'Global-Error-Clean', 'Desktop-Required-Clean',
] as const;
const expectedBehaviouralReferenceIds = ['States-Board-Clean', 'Keyboard-Clean', 'Desk-1280-Clean', 'Scorecard'] as const;
const referenceIds = designReferenceCrosswalk.map((reference) => reference.id);
const duplicateReferenceIds = duplicateValues(referenceIds);
if (duplicateReferenceIds.length) errors.push(`Duplicate design reference IDs: ${duplicateReferenceIds.join(', ')}.`);
compareSets('Shipping ZIP reference IDs', expectedShippingReferenceIds, designReferenceCrosswalk.filter((reference) => reference.kind === 'shipping').map((reference) => reference.id));
compareSets('Behavioural ZIP reference IDs', expectedBehaviouralReferenceIds, designReferenceCrosswalk.filter((reference) => reference.kind === 'behavioural').map((reference) => reference.id));
if (designReferenceCrosswalk.filter((reference) => reference.kind === 'shipping').length !== 79) {
  errors.push(`Expected 79 shipping ZIP references; found ${designReferenceCrosswalk.filter((reference) => reference.kind === 'shipping').length}.`);
}
if (designReferenceCrosswalk.filter((reference) => reference.kind === 'behavioural').length !== 4) {
  errors.push(`Expected four behavioural ZIP references; found ${designReferenceCrosswalk.filter((reference) => reference.kind === 'behavioural').length}.`);
}
const referenceOwners = new Set([
  ...surfaceManifest.map((entry) => entry.pathPattern),
  ...sharedSurfaceFamilies.map((family) => family.id),
]);
for (const reference of designReferenceCrosswalk) {
  if (!referenceOwners.has(reference.owner)) errors.push(`Design reference ${reference.id} points to an unknown owner: ${reference.owner}.`);
}
const manifestReferenceIds = surfaceManifest.flatMap((entry) => entry.referenceIds);
// Route-owned references are attached directly to their manifest entry. Shared
// shell/loading/error references are attached to the executable crosswalk's
// shared owner because they intentionally span more than one page module.
const manifestShippingReferenceIds = designReferenceCrosswalk
  .filter((reference) => reference.kind === 'shipping' && !reference.owner.startsWith('shared:'))
  .map((reference) => reference.id);
compareSets('Manifest shipping reference IDs', manifestShippingReferenceIds, manifestReferenceIds);
if (manifestReferenceIds.length !== manifestShippingReferenceIds.length) {
  errors.push(`Expected every shipping reference to be attached to a canonical surface owner; found ${manifestReferenceIds.length} attached IDs.`);
}
for (const entry of surfaceManifest) {
  const disposition = visualDispositionBySurfaceId[entry.id];
  if (!disposition) errors.push(`Manifest entry ${entry.id} has no visual disposition.`);
  if (entry.maturity === 'adapter' && disposition !== 'adapter') errors.push(`Adapter ${entry.id} must have adapter visual disposition.`);
  if (disposition === 'replace') {
    for (const id of [entry.id, ...entry.ownedStates, ...entry.ownedOverlays]) {
      if (!scenarioIds.includes(id)) errors.push(`In-scope contract ${id} is missing from the scenario ledger.`);
    }
  }
}

auditedSurfaceOwnership.forEach((surface, offset) => {
  const expectedIndex = offset + 1;
  if (surface.index !== expectedIndex) {
    errors.push(`Audited surface ${surface.id} has index ${surface.index}; expected ${expectedIndex}.`);
  }
});

const duplicateSurfaceIds = duplicateValues(auditedSurfaceOwnership.map((surface) => surface.id));
if (duplicateSurfaceIds.length) errors.push(`Duplicate audited surface IDs: ${duplicateSurfaceIds.join(', ')}.`);

const manifestPaths = new Set<string>(surfaceManifest.map((entry) => entry.pathPattern));
const sharedFamilyIds = new Set<string>(sharedSurfaceFamilies.map((family) => family.id));
for (const surface of auditedSurfaceOwnership) {
  if (surface.owner.startsWith('shared:')) {
    if (!sharedFamilyIds.has(surface.owner)) {
      errors.push(`Audited surface ${surface.id} has unknown shared owner ${surface.owner}.`);
    }
  } else if (!manifestPaths.has(surface.owner)) {
    errors.push(`Audited surface ${surface.id} has unknown route owner ${surface.owner}.`);
  }
}

for (const surface of auditedSurfaceOwnership.filter((item) => item.kind === 'route')) {
  const owner = surfaceManifest.find((entry) => entry.pathPattern === surface.owner);
  if (owner && owner.id !== surface.id) {
    errors.push(
      `Audited route ${surface.id} is owned by ${surface.owner}, whose manifest ID is ${owner.id}.`,
    );
  }
}

const auditedImplementationIds = new Set(auditedSurfaceOwnership.map((surface) => surface.id));
for (const entry of surfaceManifest.filter((item) => item.maturity !== 'adapter')) {
  if (!auditedImplementationIds.has(entry.id)) {
    errors.push(`Non-adapter manifest entry ${entry.id} has no audited surface.`);
  }
}

const auditedIds = new Set<string>(auditedSurfaceOwnership.map((surface) => surface.id));
const manifestIds = new Set<string>(surfaceManifest.map((entry) => entry.id));
for (const surface of auditedSurfaceOwnership) {
  if (surface.kind === 'route' || surface.owner.startsWith('shared:')) continue;
  if (manifestIds.has(surface.id)) continue;
  const owner = surfaceManifest.find((entry) => entry.pathPattern === surface.owner);
  const ownerIds: string[] = owner ? [...owner.ownedStates, ...owner.ownedOverlays] : [];
  if (!ownerIds.includes(surface.id)) {
    errors.push(`Audited ${surface.kind} ${surface.id} is not declared by its route manifest entry.`);
  }
}

for (const entry of surfaceManifest) {
  for (const id of [...entry.ownedStates, ...entry.ownedOverlays]) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      errors.push(`Manifest entry ${entry.id} has an unstable owned surface ID: ${id}.`);
    }
  }
}

const canonicalManifestPaths = new Set(surfaceManifest.map((entry) => entry.pathPattern));
const expectedLegacyAliases = LEGACY_UI_REDIRECTS.map((redirect) => redirect.source).filter(
  (source) => source !== '/' && !canonicalManifestPaths.has(source),
);
const manifestLegacyAliases = surfaceManifest.flatMap((entry) => [...entry.legacyAliases]);
compareSets('Legacy alias ownership', expectedLegacyAliases, manifestLegacyAliases);
const duplicateAliases = duplicateValues(manifestLegacyAliases);
if (duplicateAliases.length) errors.push(`Duplicate legacy alias ownership: ${duplicateAliases.join(', ')}.`);

for (const redirect of LEGACY_UI_REDIRECTS) {
  if (redirect.source === '/') continue;
  const owner = surfaceManifest.find((entry) => (entry.legacyAliases as readonly string[]).includes(redirect.source));
  if (!owner) continue;
  const destinationPath = redirect.destination.split('?')[0] ?? redirect.destination;
  const destinationBase = destinationPath.replace(/:[^/]+\*?/g, '').replace(/\/$/, '');
  const ownsDestinationFamily =
    owner.pathPattern === destinationBase || owner.pathPattern.startsWith(`${destinationBase}/`);
  if (!ownsDestinationFamily) {
    errors.push(
      `Legacy alias ${redirect.source} resolves to ${redirect.destination} but is owned by ${owner.pathPattern}.`,
    );
  }
}

const rootRedirect = LEGACY_UI_REDIRECTS.find((redirect) => redirect.source === '/');
if (!rootRedirect || rootRedirect.destination !== '/landing') {
  errors.push('The root redirect must remain / -> /landing.');
}

const adapterSourceChecks = [
  { pageModule: 'app/(app)/controls/page.tsx', destination: '/controls/rules' },
  { pageModule: 'app/(app)/financials/page.tsx', destination: '/financials/losses' },
  { pageModule: 'app/(app)/sources/page.tsx', destination: '/sources/connected' },
] as const;
for (const { pageModule, destination } of adapterSourceChecks) {
  const source = readFileSync(resolve(repositoryRoot, pageModule), 'utf8');
  if (!source.includes(`preservedRedirectTarget('${destination}'`)) {
    errors.push(`${pageModule} no longer preserves query state while redirecting to ${destination}.`);
  }
  const adapterEntry = surfaceManifest.find((entry) => entry.pageModule === pageModule);
  const destinationEntry = surfaceManifest.find((entry) => entry.pathPattern === destination);
  if (adapterEntry && destinationEntry) {
    compareSets(
      `${adapterEntry.pathPattern} adapter query state`,
      destinationEntry.queryState,
      adapterEntry.queryState,
    );
  }
}

const customerClaimsSource = readFileSync(
  resolve(repositoryRoot, 'app/(app)/customers/[id]/claims/page.tsx'),
  'utf8',
);
for (const expectedSource of [
  'safeUuidRedirectSegment',
  '`/cases/${claimId}`',
  "force: { return: `${customerPath}?tab=cases` }",
  "force: { tab: 'cases' }",
]) {
  if (!customerClaimsSource.includes(expectedSource)) {
    errors.push(`Customer claims adapter no longer contains required behavior: ${expectedSource}.`);
  }
}

const sharedStateSourceChecks = [
  ['app/(app)/loading.tsx', ['SuppliedAuthenticatedRouteLoading']],
  ['app/(app)/not-found.tsx', ['ExactNotFound']],
  ['components/system/ExactNotFound.tsx', ['SuppliedVisualBody', 'Not-Found-Clean']],
  ['app/not-found.tsx', ['RootNotFoundVisual', 'Root-Not-Found-Clean']],
  ['app/global-error.tsx', ['GlobalErrorVisual', 'Global-Error-Clean', 'reset()', 'DesktopRequiredBoundary']],
  ['components/states/OperationalRouteError.tsx', ['route-error-boundaries', 'Route-Error-Clean', 'A page failing should cost you one page']],
  ['components/system/DesktopRequiredBoundary.tsx', ['unsupported-portable', 'data-narrow-desktop', 'Open Unauth on a desktop']],
  ['lib/device/desktopSupport.ts', ['iPadDesktopUserAgent', "viewportWidth < 1024", 'SAFE_RETURN_KEYS']],
  ['app/layout.tsx', ['DesktopRequiredBoundary', 'throwForRootAcceptanceScenario']],
  ['app/(app)/layout.tsx', ['getRequestPermissions', 'AuthenticatedDesignShell']],
  ['app/(app)/search/page.tsx', ['getRequestPermissions', 'permissions={permissions}']],
  ['components/search/WorkspaceSearch.tsx', ['getCommandPaletteNavItems(permissionSet)', 'allowedSearchApiTypes']],
  ['app/api/search/route.ts', ['partitionSearchApiTypes', 'restrictedTypes', 'permissions.has(PERMISSIONS.VIEW_INBOX)']],
] as const;
for (const [sourcePath, requiredFragments] of sharedStateSourceChecks) {
  const source = readFileSync(resolve(repositoryRoot, sourcePath), 'utf8');
  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) {
      errors.push(`${sourcePath} no longer contains the full-app integration contract: ${fragment}.`);
    }
  }
}

const pageInventorySource = readFileSync(resolve(repositoryRoot, 'docs/page-inventory.md'), 'utf8');
for (const staleClaim of [
  're-exports the generic imports page and ignores `jobId`',
  'Full-page entity search:** `/search` only filters navigation',
  'this route only searches navigation items',
  'CommandPaletteResultsList.tsx',
  'materially richer than `/search`',
  'The named report route is only a filtered records table',
  'Unknown `/help/[articleSlug]` values render expansion placeholder copy',
  '**stub fallback** for every other slug',
]) {
  if (pageInventorySource.includes(staleClaim)) {
    errors.push(`The human-readable page inventory still contains a superseded claim: ${staleClaim}.`);
  }
}

const reportAdapterSource = readFileSync(
  resolve(repositoryRoot, 'app/(app)/financials/reports/[reportId]/page.tsx'),
  'utf8',
);
for (const expectedSource of ['NamedReportDetail', 'loadIntelligenceReport', 'reportId']) {
  if (!reportAdapterSource.includes(expectedSource)) {
    errors.push(`Named-report detail no longer contains required P03 behavior: ${expectedSource}.`);
  }
}

const importJobSource = readFileSync(
  resolve(repositoryRoot, 'app/(app)/sources/imports/[jobId]/page.tsx'),
  'utf8',
);
for (const expectedSource of ['ImportJobDetail', 'PROCESSING_JOBS', 'jobId']) {
  if (!importJobSource.includes(expectedSource)) {
    errors.push(`Import-job detail no longer contains required P05 behavior: ${expectedSource}.`);
  }
}

for (const disposition of adapterDispositions) {
  if (disposition.pageModule && !manifestPageModules.includes(disposition.pageModule)) {
    errors.push(`Adapter disposition ${disposition.pathPattern} references an unknown page module.`);
  }
}

const expectedSpecializedGapIds = Array.from({ length: 9 }, (_, index) => `g${index + 1}`);
compareSets(
  'Specialized gap dispositions',
  expectedSpecializedGapIds,
  specializedGapDispositions.map((gap) => gap.id),
);
for (const gap of specializedGapDispositions) {
  const gapId = String(gap.id);
  const gapStatus = String(gap.status);
  const gapPhase = String(gap.phase);
  if (gapId === 'g9') {
    if (gapStatus !== 'intentionally-unbuilt' || gapPhase !== 'future-brief') {
      errors.push('G9 must remain intentionally unbuilt pending a separate internal product brief.');
    }
    if (globSync('app/(internal)/**/page.tsx', { cwd: repositoryRoot }).length) {
      errors.push('G9 is intentionally unbuilt, but an internal page module now exists.');
    }
  } else if (gapStatus !== 'implemented') {
    errors.push(`${gapId.toUpperCase()} must be implemented by P08 handoff.`);
  }
  for (const evidencePath of gap.evidence) {
    if (!existsSync(resolve(repositoryRoot, evidencePath))) {
      errors.push(`${gap.id.toUpperCase()} evidence is missing: ${evidencePath}.`);
    }
  }
}

for (const supersededPath of supersededPresentationPaths) {
  if (existsSync(resolve(repositoryRoot, supersededPath))) {
    errors.push(`Superseded presentation path still exists: ${supersededPath}.`);
  }
}

const presentationSourceFiles = globSync(
  ['app/**/*.{ts,tsx,css}', 'components/**/*.{ts,tsx,css}', 'lib/**/*.{ts,tsx}', 'styles/**/*.css'],
  { cwd: repositoryRoot },
);
for (const sourceFile of presentationSourceFiles) {
  const source = readFileSync(resolve(repositoryRoot, sourceFile), 'utf8');
  for (const supersededPath of supersededPresentationPaths) {
    if (source.includes(supersededPath)) {
      errors.push(`${sourceFile} still references superseded presentation path ${supersededPath}.`);
    }
  }
}

const competingStylePaths = globSync(
  ['styles/authenticated/**', 'styles/p07.css'],
  { cwd: repositoryRoot, nodir: true },
);
if (competingStylePaths.length > 0) {
  errors.push(`Competing presentation files still exist: ${competingStylePaths.sort().join(', ')}.`);
}

const rootLayoutSource = readFileSync(resolve(repositoryRoot, 'app/layout.tsx'), 'utf8');
if (rootLayoutSource.includes('styles/authenticated/')) {
  errors.push('The root layout must not load a competing presentation cascade.');
}
const publicLayoutSource = readFileSync(resolve(repositoryRoot, 'app/(public)/layout.tsx'), 'utf8');
if (!publicLayoutSource.includes("@/components/public/PublicUI") || !publicLayoutSource.includes('<PublicRoot>')) {
  errors.push('Public routes must use the registered Loop public presentation root.');
}
const publicRootSource = readFileSync(resolve(repositoryRoot, 'components/public/PublicUI.tsx'), 'utf8');
if (!publicRootSource.includes('data-public-root') || !publicRootSource.includes('unauth-public-refinement-2026-09-16')) {
  errors.push('Public root must declare the approved public-only revision and scope.');
}
if (publicLayoutSource.includes('styles/authenticated/') || publicLayoutSource.includes('styles/p07.css')) {
  errors.push('Public routes still load a competing presentation cascade.');
}
const productLayoutSource = readFileSync(resolve(repositoryRoot, 'app/(app)/layout.tsx'), 'utf8');
for (const prohibited of ['ColorModeProvider', 'data-color-mode=', 'dashboard-design-challenge']) {
  if (productLayoutSource.includes(prohibited)) errors.push(`Authenticated layout still contains ${prohibited}.`);
}

const purgeFiles = globSync(
  ['app/**/*.{ts,tsx,css}', 'components/**/*.{ts,tsx,css}', 'styles/**/*.css'],
  { cwd: repositoryRoot },
);
const purgePatterns = [
  /--ua-/,
  /--c-[A-Za-z0-9-]+/,
  /dashboard-design-challenge/i,
  /Challenge6/,
  /data-challenge6/i,
  /landing-visual-system=["']neutral/i,
  /styles\/authenticated\//,
  /styles\/p07\.css/,
  /Signal Ledger/,
  /\bMocha\b/,
  /color-modes\.css/,
  /replacement\.css/,
  /\bi[23]-[0-9]/,
];
for (const sourceFile of purgeFiles) {
  const source = readFileSync(resolve(repositoryRoot, sourceFile), 'utf8');
  for (const pattern of purgePatterns) {
    if (pattern.test(source)) errors.push(`${sourceFile} still contains prohibited presentation contract ${pattern}.`);
  }
}

if (errors.length) {
  console.error('Surface manifest verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Surface manifest verified: ${surfaceManifest.length} page modules, ` +
      `${auditedSurfaceOwnership.length} audited surfaces, ${auditedIds.size} stable surface IDs, ` +
      `${scenarioLedger.length} comprehensive scenarios.`,
  );
  console.log(`Phase ownership: ${JSON.stringify(phaseCounts)}.`);
  console.log(`Legacy aliases verified: ${manifestLegacyAliases.length} plus the root redirect.`);
}
