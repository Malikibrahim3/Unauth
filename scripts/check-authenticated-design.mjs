import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const scanRoots = [
  'app/(app)',
  'app/(auth)',
  'app/onboarding',
  // Root-level boundaries (global-error, not-found, layout) render product
  // chrome and must obey the product contract. They were outside every scan
  // root until 2026-07-26, which is how global-error.tsx kept the entire
  // pre-Quiet-Precision palette — cream canvas, orange button — intact.
  'app/root-files',
  'styles/authenticated',
  'components/charts/authenticated',
  ...[
    'apply', 'analytics', 'authenticated', 'billing', 'cases', 'claims', 'collaboration',
    'connections', 'customers', 'evidence', 'exceptions', 'identity', 'imports',
    'dashboard', 'inbox', 'integrations', 'layout', 'losses', 'nav', 'navigation',
    'notifications', 'product', 'relationships', 'reporting', 'reports', 'rules',
    'settings', 'shopify', 'sources', 'states', 'support', 'ui', 'work', 'workbench',
  ].map((dir) => `components/${dir}`),
];

// Whole files excluded from every check below — these are the token
// *definitions* themselves (hex/rgba values are expected there), or
// documented landing-only assets.
const ignored = new Set([
  'components/ui/LandingPrimitives.tsx',
  'components/ui/tokens.ts',
  'styles/authenticated/tokens.css',
  'styles/authenticated/status.css',
  'styles/authenticated/foundations.css',
  'styles/authenticated/controls.css',
]);

// Grandfathered pre-existing debt — real hits that predate this lint rule
// and this pass's design-system consolidation. Not exemptions for new code;
// each is logged in docs/design/authenticated-style-system-validation.md as
// remaining cleanup, not silently accepted. Adding a NEW file here for a NEW
// violation defeats the point of the rule — fix the value or add a narrowly-
// scoped documented exception instead (see styles/authenticated/README.md's
// "Exception mechanism" section: data-viz literals and third-party brand
// marks are the only sanctioned categories).
/*
 * Documented exception (styles/authenticated/README.md "Exception mechanism"):
 * the root error boundary renders when the root layout — and therefore possibly
 * the stylesheet — has failed, so it cannot rely on custom properties resolving.
 * It uses `var(--ua-token, #literal)` throughout; the literals are the current
 * Living Precision values and must be kept in step with tokens.css. This is the
 * only file permitted a palette literal fallback.
 */
const stylesheetIndependentBoundaries = new Set([
  'app/global-error.tsx',
]);

const hardcodedColorGrandfathered = new Set([
  'app/(app)/help/integrations/siena/page.tsx',
  'app/(app)/help/integrations/yuma/page.tsx',
  'app/(app)/recoveries/[id]/page.tsx',
  'components/collaboration/CaseComments.tsx',
  'components/connections/ConnectionPromptStrip.tsx',
  'components/losses/LossLedger.tsx',
  'components/rules/RuleBuilderDrawer.tsx',
  'components/rules/ConditionBlock.tsx',
  'components/sources/FreshnessIndicator.tsx',
  'components/sources/SourceBadge.tsx',
]);
const arbitraryRadiusGrandfathered = new Set([
  'app/(app)/customers/CustomersOverviewFilterChip.tsx',
  'app/(app)/partners/PartnerRulebookClient.tsx',
  'app/(app)/claims/ClaimsPageView.tsx',
  'components/apply/FoundingMerchantApplicationForm.tsx',
  'components/claims/ClaimReviewHeader.tsx',
  'components/nav/SidebarNavItem.tsx',
]);

// Components documented as deprecated in
// docs/design/authenticated-component-migration-register.md. Empty for now:
// nothing found during the design-system consolidation is deprecated
// cleanly enough to retroactively enforce without breaking in-flight work
// (see the register's "why components/claims is excluded" note). Add an
// entry here — { module: '@/path/to/file', names: ['ExportName'], message:
// 'Use X instead.' } — once a replacement is fully migrated and the register
// says so.
const deprecatedImports = [];

const oldPalette = /#(?:7b2d26|5e2018|a85040|f4e6e0|f8f5ee|fdfbf6|d8d0bd|4a4640|8a8472|ead8d2|8a2828|c45c4c|a84035|18150f|211d16|ff5a0a|f7f5f0|181715|e8e4dc|345d50|8a857c|666159|e5e1d8|e0ddd7|9a958d|fbfbfa|f8f8f6)\b|var\(--(?:copper-(?:bright|mid|dim|glow)|brand-rust(?:-hover|-soft)?)\)/gi;
const landingDependency = /var\(--(?:landing-|fl-)/g;
// Hex / rgb(a) / hsl(a) literals, and inline color/background/border style
// props holding a literal instead of a var() reference. Data-viz series
// colours and third-party brand marks are the sanctioned exceptions (see
// styles/authenticated/README.md) — grandfather a specific file only when
// it predates this rule, not to work around it for new code.
const hardcodedColor = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g;
// rounded-[...] with a literal value (not a var() reference).
const arbitraryRadius = /rounded-\[(?!var\()[^\]]+\]/g;
// Inline borderRadius holding a literal instead of var() — the CSS-in-JS
// form of the Tailwind rounded-[...] check above. "50%" is allowed: it
// makes a circle (avatars, dots, status indicators), which is a shape, not
// a point on the radius scale.
const arbitraryRadiusInline = /borderRadius:\s*(['"])(?!var\()(?!50%\1)(?!\1\1)[^'"]+\1/g;
// Inline boxShadow holding a literal instead of var() or the bare literal
// "none" (which is a legitimate "no shadow" value, not a hardcoded shadow).
const arbitraryShadow = /boxShadow:\s*(['"])(?!var\()(?!none\1)[^'"]+\1/g;
const directChartLibrary = /from\s+['"](?:recharts|chart\.js|react-chartjs-2)['"]/g;
const obsoleteVisualSummary = /OperationalVisualSummary|data-visual-summary/g;
// echarts was fully removed in the Autumn chart pass (§12) — an import anywhere is a regression.
const echartsImport = /from\s+['"]echarts(?:-for-react)?['"]/g;
// The --dashboard-* remap layer was deleted (§12.2); components read --ua-chart-* directly.
const dashboardRemapVar = /var\(--dashboard-[a-z-]+\)/g;
/*
 * Living Precision §3.8 source-token migration. Every token below was deleted
 * or renamed in the same merge unit that moved its consumers, so any surviving
 * reference is a regression, not debt:
 *   --ua-chart-1…5 / --ua-chart-neutral   → role-named §6.2 chart tokens
 *   --ua-chart-ramp-primary/attention-*   → the single --ua-chart-ramp-1…4 accent ramp
 *   --ua-chart-heat-*                     → the same accent ramp
 *   --ua-violet*                          → accent roles (selection) or status roles (meaning)
 *   --ua-text-micro/small/card-title/total → metadata / dense / chart-title / hero-value
 * There is no alias layer, and adding one back is the failure this rule exists
 * to catch.
 */
/*
 * §7.2 (LP-MOT-02). A press is a fill response, a hover is a colour response,
 * and a selection transitions colour — none of them translate, lift, or animate
 * layout. `transition-all` sweeps in width/height/transform/border, which is how
 * the old nav lift and control shake survived every previous cleanup.
 */
const forbiddenMotion = /\bua-jitter\b|\btransition-all\b|hover:-?translate-|hover:shadow-|ua-hover-lift|ua-hover-glow/g;
const deletedTokenRef =
  /--ua-chart-(?:[1-5]|neutral)(?![-0-9a-z])|--ua-chart-(?:ramp-(?:primary|attention)|heat)-|--ua-violet\b|--ua-text-(?:micro|small|card-title|total)-/g;
// Recharts' own default palette/tooltip must never render — a lint tell for the Autumn
// restyle (§13.3d): the library defaults are always a sign useChartTheme()/ChartTooltip
// weren't wired up for that chart.
const rechartsDefaultTell = /#8884d8|#82ca9d|<Tooltip\s*\/>/g;

// ── Spec §17.1 rules ────────────────────────────────────────────────────────

// 1. Forbidden legacy token namespace. `--ua-*` is the only authenticated
//    visual namespace (§14.2). Everything else is either a public/landing
//    token or a component-local data-derived property, and the latter must be
//    declared here so the rule stays exhaustive rather than advisory.
const LOCAL_CUSTOM_PROPS = new Set([
  // Data-derived geometry assigned inline by a component.
  '--bars', '--columns', '--health-columns', '--step-text',
  '--data-currency', '--data-date', '--data-id',
  // next/font handles — referenced only inside typography.css.
  '--font-dm-sans', '--font-dm-mono',
  // Third-party (reactflow) internals.
  '--xy-edge-stroke-default', '--xy-node-boxshadow-default',
  '--radix-accordion-content-height',
]);
const anyCustomPropRef = /var\((--[a-zA-Z0-9-]+)/g;

// 2. Landing primitives must never reach product UI (§6.11, §16.3).
const landingPrimitiveImport = /from\s+['"](?:@\/components\/ui\/LandingPrimitives|\.\/LandingPrimitives|\.\.\/ui\/LandingPrimitives)['"]/g;

// 3. Chart textures, gradients, and glow (§16.4).
const chartTexture = /<(?:linearGradient|radialGradient|pattern)\b|linear-gradient\(|radial-gradient\(|feGaussianBlur|\bhatch/gi;

// 4. Arbitrary Tailwind values carrying a *design* literal rather than a
//    token. Structural layout dimensions (grid templates, container widths,
//    element sizing) are not design tokens and stay permitted; colour, radius,
//    shadow, type size, leading, tracking, and spacing are all token-backed.
//    A value is acceptable when it is composed *entirely* of --ua-* tokens
//    (including inside color-mix()/inset wrappers) and contains no raw literal.
const arbitraryDesignValueCandidate =
  /\b(?:text|leading|tracking|bg|border|divide|ring|outline|shadow|rounded|gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-x|space-y|duration|ease)-\[[^\]]+\]/g;
const rawVisualLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(|\b\d+(?:\.\d+)?(?:px|em|rem)\b|\b(?:white|black)\b/;
function isArbitraryDesignViolation(text) {
  if (!/var\(--ua-/.test(text)) return true;
  return rawVisualLiteral.test(text);
}

// 5. Type must be sentence case: no uppercase + letter-spacing eyebrows (§3.2).
//    Matches the Tailwind `uppercase` class and the CSS `text-transform`
//    declaration — not `String.prototype.toUpperCase`, which title-cases a
//    label rather than shouting it.
const upperCaseEyebrow = /(?<![A-Za-z.])uppercase\b/g;

// 6. Hand-rolled tables outside the canonical table primitives (§6.6).
//    Counted by the ratchet rather than failed outright: ten product tables
//    still predate DataTable, and migrating a financial/audit table is a
//    behaviour change, not a restyle. The count may only go down.
const handRolledTable = /<table\b/g;
const TABLE_PRIMITIVE_FILES = new Set([
  'components/ui/DataTable.tsx',
  'components/ui/DataTableServer.tsx',
  // §8.1 requires every chart to expose an accessible data table; this is that
  // table (the canonical ChartDataTable), not a hand-rolled data grid.
  'components/charts/authenticated/ChartDataTableDisclosure.tsx',
  // Canonical low-level skeleton geometry.
  'components/navigation/skeletons/primitives.tsx',
]);

// 7. Route-local skeleton markup (§6.9) — extends the animate-pulse check to
//    any loading.tsx that hand-builds geometry instead of using a shared
//    skeleton primitive.
// Matches either a skeleton module path or a skeleton named import from the
// design-system barrel.
const sharedSkeletonImport =
  /from\s+['"][^'"]*(?:pageSkeletons|OperationalRouteSkeleton|WorkbenchPageSkeleton|Skeleton)['"]|import\s*\{[^}]*\b(?:LoadingSkeleton|LoadingState|Skeleton|[A-Za-z]+Skeleton)\b[^}]*\}/;

/*
 * Ratchet for pre-existing arbitrary-value and uppercase debt.
 *
 * Unlike a per-file grandfather list, a single number cannot be quietly
 * extended to admit a new violation: any new hit pushes the count over the
 * ceiling and fails the build. Lower these as the debt is paid; never raise
 * them.
 */
const RATCHET = {
  // Structural layout dimensions are permitted; these are the remaining
  // design literals (element sizing, container widths, grid templates).
  arbitraryDesignValue: 0,
  // Sentence case is the rule (§3.2) — this must stay at zero.
  upperCaseEyebrow: 0,
  // Product tables still to migrate onto DataTable / DataTableServer (§6.6).
  // Tracked in docs/REVIEW_quiet_precision_implementation.md; migrating a
  // financial or audit table is a behaviour change, not a restyle, so each is
  // done deliberately. This number may only go down.
  handRolledTable: 0,
};

const allowedExtensions = new Set(['.ts', '.tsx', '.css']);

const ROOT_LEVEL_APP_FILES = [
  'app/global-error.tsx',
  'app/not-found.tsx',
  'app/layout.tsx',
];

async function filesUnder(path) {
  // Pseudo-root: an explicit list of root-level app files rather than a folder.
  if (path === 'app/root-files') {
    const present = [];
    for (const file of ROOT_LEVEL_APP_FILES) {
      try {
        const info = await stat(join(ROOT, file));
        if (info.isFile()) present.push(file);
      } catch { /* optional file */ }
    }
    return present;
  }
  const absolute = join(ROOT, path);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const results = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) results.push(...await filesUnder(child));
    else if (allowedExtensions.has(extname(entry.name))) results.push(child);
  }
  return results;
}

function findMatches(source, expression) {
  expression.lastIndex = 0;
  const matches = [];
  let match;
  while ((match = expression.exec(source))) {
    const line = source.slice(0, match.index).split('\n').length;
    matches.push({ line, text: match[0] });
    if (match[0].length === 0) expression.lastIndex += 1; // guard against zero-width infinite loop
  }
  return matches;
}

const files = (await Promise.all(scanRoots.map(filesUnder))).flat();
const failures = [];
const ratchetCounts = { arbitraryDesignValue: 0, upperCaseEyebrow: 0, handRolledTable: 0 };
const ratchetHits = { arbitraryDesignValue: [], upperCaseEyebrow: [], handRolledTable: [] };

for (const file of files) {
  const normalized = relative(ROOT, join(ROOT, file));
  if (ignored.has(normalized)) continue;
  const source = await readFile(join(ROOT, file), 'utf8');

  for (const { line, text } of findMatches(source, obsoleteVisualSummary)) {
    failures.push(`${normalized}:${line} obsolete repeated chart: ${text} — select a purpose-built component from components/charts/authenticated`);
  }

  for (const [rule, expression] of [['old palette', oldPalette], ['landing token dependency', landingDependency]]) {
    for (const { line, text } of findMatches(source, expression)) {
      failures.push(`${normalized}:${line} ${rule}: ${text} — replace with a styles/authenticated token`);
    }
  }

  if (!hardcodedColorGrandfathered.has(normalized) && !stylesheetIndependentBoundaries.has(normalized)) {
    for (const { line, text } of findMatches(source, hardcodedColor)) {
      failures.push(`${normalized}:${line} hardcoded colour: ${text} — use a var(--ua-*) token, or a documented data-viz/brand-mark exception`);
    }
  }

  if (!arbitraryRadiusGrandfathered.has(normalized)) {
    for (const { line, text } of findMatches(source, arbitraryRadius)) {
      failures.push(`${normalized}:${line} arbitrary radius: ${text} — use one of the --ua-radius-* tokens`);
    }
    for (const { line, text } of findMatches(source, arbitraryRadiusInline)) {
      failures.push(`${normalized}:${line} arbitrary radius: ${text} — use one of the --ua-radius-* tokens`);
    }
  }

  for (const { line, text } of findMatches(source, arbitraryShadow)) {
    failures.push(`${normalized}:${line} arbitrary shadow: ${text} — use one of the --ua-shadow-* tokens, or literal "none"`);
  }

  // Recharts is confined to the cartesian primitives (Autumn chart system §4.1/§13.3b) —
  // /dashboard and /reports consume it only through components/charts/authenticated/cartesian/.
  const chartLibraryAllowed = normalized.startsWith('components/charts/authenticated/cartesian/');
  if (!chartLibraryAllowed) {
    for (const { line, text } of findMatches(source, directChartLibrary)) {
      failures.push(`${normalized}:${line} direct chart dependency: ${text} — use components/charts/authenticated/cartesian/, not a page-local chart import`);
    }
  }

  for (const { line, text } of findMatches(source, echartsImport)) {
    failures.push(`${normalized}:${line} echarts import: ${text} — echarts was removed (§12); use a components/charts/authenticated primitive`);
  }

  for (const { line, text } of findMatches(source, dashboardRemapVar)) {
    failures.push(`${normalized}:${line} deleted remap token: ${text} — the --dashboard-* layer was removed (§12); read --ua-chart-* directly`);
  }

  for (const { line, text } of findMatches(source, forbiddenMotion)) {
    failures.push(
      `${normalized}:${line} forbidden motion: ${text} — §7.2 allows colour/background/border transitions only; no lift, shake, or animated layout`,
    );
  }

  for (const { line, text } of findMatches(source, deletedTokenRef)) {
    failures.push(
      `${normalized}:${line} deleted or renamed token: ${text} — see docs/IMPL_living_precision_product_ui.md §3.8; move the consumer to the current role token instead of restoring an alias`,
    );
  }

  if (chartLibraryAllowed) {
    for (const { line, text } of findMatches(source, rechartsDefaultTell)) {
      failures.push(`${normalized}:${line} recharts default style: ${text} — wire useChartTheme()/ChartTooltip instead of letting Recharts fall back to its defaults`);
    }
  }

  if (normalized.startsWith('app/(app)/') && normalized.endsWith('/loading.tsx') && /animate-pulse/.test(source)) {
    failures.push(`${normalized}: route-local pulse markup — select a shared geometry-matched skeleton instead`);
  }

  // §17.1 — forbidden legacy token namespace.
  if (normalized !== 'styles/authenticated/typography.css') {
    for (const { line, text } of findMatches(source, anyCustomPropRef)) {
      const name = text.replace('var(', '');
      if (name.startsWith('--ua-') || LOCAL_CUSTOM_PROPS.has(name)) continue;
      failures.push(
        `${normalized}:${line} forbidden legacy token: ${name} — authenticated code may only read var(--ua-*); public tokens stay in app/globals.css`,
      );
    }
  }

  // §17.1 — landing primitives in product UI.
  for (const { line, text } of findMatches(source, landingPrimitiveImport)) {
    failures.push(
      `${normalized}:${line} landing primitive import: ${text} — use Panel / EvidenceRow / AuthenticatedPanel; LandingPrimitives is public-only`,
    );
  }

  // §17.1 — obsolete chart textures and gradients.
  for (const { line, text } of findMatches(source, chartTexture)) {
    failures.push(
      `${normalized}:${line} chart texture/gradient: ${text} — Living Precision charts use flat fills and solid/dashed strokes only`,
    );
  }

  // §17.1 — hand-rolled tables (ratcheted; see RATCHET).
  if (!TABLE_PRIMITIVE_FILES.has(normalized) && extname(file) !== '.css') {
    for (const { line, text } of findMatches(source, handRolledTable)) {
      ratchetCounts.handRolledTable += 1;
      ratchetHits.handRolledTable.push(`${normalized}:${line} ${text}`);
    }
  }

  // §17.1 — route-local skeleton markup.
  if (normalized.startsWith('app/(app)/') && normalized.endsWith('/loading.tsx')) {
    if (/animate-pulse/.test(source)) {
      failures.push(`${normalized}: route-local pulse markup — use a shared geometry-matched skeleton instead`);
    } else if (!sharedSkeletonImport.test(source)) {
      failures.push(`${normalized}: route-local skeleton geometry — import a shared skeleton that mirrors the resolved page composition`);
    }
  }

  // Ratcheted counts — see RATCHET above.
  for (const [rule, expression] of [
    ['arbitraryDesignValue', arbitraryDesignValueCandidate],
    ['upperCaseEyebrow', upperCaseEyebrow],
  ]) {
    for (const { line, text } of findMatches(source, expression)) {
      if (rule === 'arbitraryDesignValue' && !isArbitraryDesignViolation(text)) continue;
      ratchetCounts[rule] += 1;
      ratchetHits[rule].push(`${normalized}:${line} ${text}`);
    }
  }

  for (const dep of deprecatedImports) {
    const importPattern = new RegExp(
      `import\\s*\\{[^}]*\\b(${dep.names.join('|')})\\b[^}]*\\}\\s*from\\s*['"]${dep.module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
      'g',
    );
    for (const { line, text } of findMatches(source, importPattern)) {
      failures.push(`${normalized}:${line} deprecated import: ${text} — ${dep.message}`);
    }
  }
}

for (const [rule, ceiling] of Object.entries(RATCHET)) {
  const actual = ratchetCounts[rule];
  if (actual > ceiling) {
    const hits = (ratchetHits[rule] ?? []).slice(0, 12).map((h) => `\n    ${h}`).join('');
    failures.push(
      `ratchet exceeded: ${rule} is ${actual}, ceiling is ${ceiling} — fix the value; do not raise the ceiling${hits}`,
    );
  }
}

if (failures.length) {
  console.error('Authenticated design guard failed:\n' + failures.join('\n'));
  process.exit(1);
}

const ratchetReport = Object.entries(RATCHET)
  .map(([rule, ceiling]) => `${rule} ${ratchetCounts[rule]}/${ceiling}`)
  .join(', ');
console.log(`Authenticated design guard passed (${files.length} files checked; ratchet: ${ratchetReport}).`);
