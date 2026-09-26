import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  adapterDispositions,
  auditedSurfaceOwnership,
  scenarioLedger,
  surfaceManifest,
  merchantClarityCoverage,
  specificationAuthorities,
} from '../lib/surfaces/manifest';
import { APP_ROUTES } from '../lib/navigation/appRoutes';
import { PERMISSIONS, type Permission } from '../lib/permissions/constants';
import { TEAM_ROLES, type Role } from '../lib/permissions/roles';
import permissionProfileSource from './acceptance/role-profiles.json';

type InventoryEntry = {
  label: string;
  body: string;
};

type AcceptanceRow = {
  scenarioId: string;
  auditedSurfaceId: string | null;
  owner: string;
  route: string;
  label: string;
  kind: string;
  disposition: string;
  pageModule: string | null;
  shell: string | null;
  archetype: string | null;
  phase: string | null;
  deliveryPhases: readonly string[];
  requirementIds: readonly string[];
  implementationReadiness: string;
  primaryComponents: readonly string[];
  responsiveFamily: string;
  viewport: readonly string[];
  theme: readonly string[];
  merchantGoal: string;
  expectedBehaviour: string;
  activationRecipe: string;
  queryState: readonly string[];
  ownedStates: readonly string[];
  ownedOverlays: readonly string[];
  actions: readonly string[];
  permissions: readonly string[];
  dataDependencies: readonly string[];
  legacyAliases: readonly string[];
  permissionGate: string | null;
  rolesToExercise: readonly Role[];
  permissionProfiles: readonly PermissionProfile[];
  truthContracts: readonly string[];
  mutationBoundary: string;
  cleanupExpectation: string;
  evidencePath: string;
  evidencePaths: string[];
  verdict: 'passed' | 'partial' | 'blocked' | 'untested';
  verdictNote: string | null;
};

type PermissionProfile = {
  id: string;
  persona: 'finance' | 'support';
  role: Role;
  delegatedPermissions: readonly Permission[];
};

type EvidenceRecord = {
  verdict: AcceptanceRow['verdict'];
  evidencePaths?: string[];
  note?: string;
};

const repositoryRoot = resolve(__dirname, '..');
const acceptanceRoot = process.env.FULL_APP_ACCEPTANCE_ROOT?.trim()
  || 'artifacts/full-app-acceptance-2026-08-30';
const defaultOutput = resolve(
  repositoryRoot,
  `${acceptanceRoot}/acceptance-ledger.json`,
);
const outputPath = resolve(process.argv.find((value) => value.startsWith('--out='))?.slice(6) ?? defaultOutput);
const defaultEvidencePath = resolve(
  repositoryRoot,
  `${acceptanceRoot}/physical/scenario-evidence-index.json`,
);

type RequirementRow = {
  id: string;
  description: string;
  deliveryPhases: string[];
  scenarioIds: string[];
  verdict: 'untested';
  evidencePaths: string[];
};

// Wording and phase ownership come from the single execution plan. The
// manifest contributes only scenario links. Scenario receipts cannot by
// themselves certify all of a requirement's behavioural obligations.
const planSource = readFileSync(resolve(repositoryRoot, specificationAuthorities.currentExecution), 'utf8');
function phasesIn(value: string): string[] {
  if (/Every phase|P00 through P12/.test(value)) return Array.from({ length: 13 }, (_, i) => `P${String(i).padStart(2, '0')}`);
  return [...new Set(value.match(/P\d{2}/g) ?? [])];
}
const requirementRows: RequirementRow[] = [];
let checkDelivery = '';
for (const line of planSource.split('\n')) {
  if (line.startsWith('Delivery:')) checkDelivery = line;
  const table = line.match(/^\| (F\d{2}|M\d{2}) \| (.+) \|$/);
  const check = line.match(/^- \[[ x]\] (C\d{3}) (.+)$/);
  if (!table && !check) continue;
  const id = (table ?? check)![1];
  const cells = table?.[2].split('|').map((cell) => cell.trim());
  const description = check?.[2] ?? (id.startsWith('F') ? cells![1] : cells![0]);
  const deliveryPhases = phasesIn(check ? checkDelivery : cells!.at(-1)!);
  const group = merchantClarityCoverage.find((entry) => (entry.requirementIds as readonly string[]).includes(id));
  if (!group || !deliveryPhases.length) throw new Error(`Missing scenario or phase ownership for ${id}`);
  const scenarioIds = (group.scenarioIds as readonly string[]).includes('*') ? scenarioLedger.map((scenario) => scenario.id) : [...group.scenarioIds];
  for (const scenarioId of scenarioIds) {
    if (!scenarioLedger.some((scenario) => scenario.id === scenarioId)) throw new Error(`${id} refers to missing scenario ${scenarioId}`);
  }
  requirementRows.push({ id, description, deliveryPhases, scenarioIds, verdict: 'untested', evidencePaths: [] });
}

function loadEvidence(): Map<string, EvidenceRecord> {
  const suppliedEvidencePath = process.argv.find((value) => value.startsWith('--evidence='))?.slice('--evidence='.length);
  const evidencePath = resolve(
    suppliedEvidencePath ?? defaultEvidencePath,
  );
  try {
    const parsed = JSON.parse(readFileSync(evidencePath, 'utf8')) as {
      scenarios?: Record<string, EvidenceRecord>;
    };
    return new Map(Object.entries(parsed.scenarios ?? {}));
  } catch (error) {
    if (!suppliedEvidencePath && (error as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw new Error(`Could not load acceptance evidence from ${evidencePath}`, { cause: error });
  }
}

function parseInventory(): Map<string, InventoryEntry> {
  const source = readFileSync(resolve(repositoryRoot, 'docs/page-inventory.md'), 'utf8');
  const entries = new Map<string, InventoryEntry>();
  const headings = [...source.matchAll(/^### \[(.+?)\]\s*$/gm)];
  headings.forEach((match, index) => {
    const label = match[1]?.trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    const body = source.slice(start, end).trim();
    if (label && body) entries.set(label, { label, body });
  });
  return entries;
}

function field(body: string, name: string): string | null {
  const match = body.match(new RegExp(`^- ${name}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function routePermission(owner: string): string | null {
  const routes = Object.values(APP_ROUTES) as Array<{
    href: string;
    sectionPrefix?: string;
    permission?: string;
  }>;
  const route = routes.find((candidate) => {
    const prefix = candidate.sectionPrefix ?? candidate.href;
    return owner === candidate.href || owner.startsWith(`${prefix}/`);
  });
  return route?.permission ?? null;
}

function ownerEntry(owner: string) {
  return surfaceManifest.find((entry) => entry.pathPattern === owner)
    ?? surfaceManifest.find((entry) => owner.startsWith(`${entry.pathPattern}/`));
}

function auditEntry(scenarioId: string, owner: string) {
  return auditedSurfaceOwnership.find((surface) => surface.id === scenarioId)
    ?? auditedSurfaceOwnership.find((surface) => surface.owner === owner && surface.id === scenarioId);
}

function expectedBehaviour(kind: string, inventoryBody: string | undefined, activationRecipe: string): string {
  const action = inventoryBody ? field(inventoryBody, 'Primary user action') : null;
  const state = inventoryBody ? field(inventoryBody, 'Current state') : null;
  if (action && state) return `${action} Current implementation: ${state}.`;
  if (action) return action;
  return kind === 'adapter'
    ? 'Redirect to the canonical destination while preserving the declared query context.'
    : activationRecipe;
}

function mutationBoundary(kind: string, scenarioId: string): string {
  if (kind === 'overlay') return `Open ${scenarioId}; submit only against the disposable local fixture when the action is explicitly synthetic.`;
  if (kind === 'adapter' || kind === 'route' || kind === 'state' || kind === 'loading' || kind === 'not-found' || kind === 'error') {
    return 'Read-only navigation unless the owning workflow explicitly exercises a disposable local mutation.';
  }
  return 'No external provider, billing, email, or deployed-preview mutation.';
}

function cleanupExpectation(kind: string): string {
  return kind === 'overlay'
    ? 'Capture pre/post state, audit consequence, and remove or reverse synthetic records after the scenario.'
    : 'No persistent change expected; restore URL, theme, cookies, and fixture state after the scenario.';
}

const knownRoles = new Set<string>(TEAM_ROLES);
const knownPermissions = new Set<string>(Object.values(PERMISSIONS));
const permissionProfiles: PermissionProfile[] = permissionProfileSource.map((profile) => {
  if (!knownRoles.has(profile.role)) throw new Error(`Unknown canonical role in permission profile ${profile.id}`);
  const delegatedPermissions = profile.delegatedPermissions.map((permission) => {
    if (!knownPermissions.has(permission)) throw new Error(`Unknown delegated permission ${permission} in ${profile.id}`);
    return permission as Permission;
  });
  if (profile.persona !== 'finance' && profile.persona !== 'support') {
    throw new Error(`Unknown persona ${profile.persona} in permission profile ${profile.id}`);
  }
  return {
    id: profile.id,
    persona: profile.persona,
    role: profile.role as Role,
    delegatedPermissions,
  };
});

function rolesFor(): Role[] {
  return [...TEAM_ROLES];
}

function viewportFor(): string[] {
  return ['1024x720 desktop', '1280x720 desktop', '1440x900 reference', '1280x600 short desktop',
    'phone/tablet portrait and wide landscape: desktop notice only',
    'narrow desktop window and desktop zoom: independent essential-access checks'];
}

function themeFor(responsiveFamily: string): string[] {
  return responsiveFamily === 'public-auth-onboarding'
    ? ['light-only']
    : ['light-only'];
}

function actionsFor(kind: string): string[] {
  if (kind === 'adapter') return ['follow redirect', 'verify canonical destination', 'verify declared query policy'];
  if (kind === 'overlay') return ['open', 'inspect review boundary', 'dismiss with visible close policy'];
  if (kind === 'loading') return ['observe reserved loading geometry', 'wait for settled state'];
  if (kind === 'error') return ['observe error boundary', 'retry when offered', 'preserve context'];
  if (kind === 'not-found') return ['open unknown target', 'use return path'];
  if (kind === 'state') return ['activate deterministic state', 'verify truthful copy', 'retry when offered'];
  return ['navigate', 'refresh', 'use back/forward and deep link'];
}

function permissionsFor(permissionGate: string | null, roles: readonly Role[]): string[] {
  return permissionGate ? [`requires ${permissionGate}`, ...roles] : ['public or authenticated as owner permits', ...roles];
}

function rows(evidence: Map<string, EvidenceRecord>): AcceptanceRow[] {
  const inventory = parseInventory();
  const labels = new Map(auditedSurfaceOwnership.map((surface) => [surface.id, surface.label]));
  const truthContracts = [
    'unknown/unavailable/partial/stale/verified-zero remain distinct',
    'evidence, recommendation, merchant decision, provider action, and audit history remain distinct',
    'provider approval is not received, matched, or reconciled money',
    'money retains integer minor units, currency, period, source, freshness, and reconciliation scope',
  ] as const;

  return scenarioLedger.map((scenario) => {
    const entry = ownerEntry(scenario.owner);
    const audit = auditEntry(scenario.id, scenario.owner);
    const label = labels.get(scenario.id) ?? entry?.id ?? scenario.id;
    const inventoryEntry = inventory.get(label);
    const adapter = adapterDispositions.find((candidate) => candidate.pathPattern === scenario.owner);
    const permissionGate = entry ? routePermission(entry.pathPattern) : null;
    const recorded = evidence.get(scenario.id);
    if (scenario.readiness === 'planned' && recorded?.verdict === 'passed') {
      throw new Error(`Planned scenario ${scenario.id} cannot inherit a passing receipt before implementation is recorded.`);
    }
    const requirements = requirementRows.filter((requirement) => requirement.scenarioIds.includes(scenario.id));
    return {
      scenarioId: scenario.id,
      auditedSurfaceId: audit?.id ?? null,
      owner: scenario.owner,
      // `owner` is the manifest's canonical path pattern. Keep an explicit
      // route column in the generated acceptance artifact so every row can be
      // consumed by the physical harness without inventing another route map.
      route: scenario.owner,
      label,
      kind: scenario.kind,
      disposition: scenario.disposition,
      pageModule: scenario.pageModule,
      shell: entry?.shell ?? null,
      archetype: entry?.archetype ?? null,
      phase: entry?.phase ?? adapter?.phase ?? null,
      deliveryPhases: [...new Set(requirements.flatMap((requirement) => requirement.deliveryPhases))],
      requirementIds: requirements.map((requirement) => requirement.id),
      implementationReadiness: scenario.readiness,
      primaryComponents: entry?.primaryComponents ?? [],
      responsiveFamily: scenario.viewportFamily,
      viewport: viewportFor(),
      theme: themeFor(scenario.viewportFamily),
      merchantGoal: field(inventoryEntry?.body ?? '', 'What it does') ?? `Exercise ${label}.`,
      expectedBehaviour: expectedBehaviour(scenario.kind, inventoryEntry?.body, scenario.activationRecipe),
      activationRecipe: scenario.activationRecipe,
      queryState: entry?.queryState ?? [],
      ownedStates: entry?.ownedStates ?? [],
      ownedOverlays: entry?.ownedOverlays ?? [],
      actions: actionsFor(scenario.kind),
      permissions: permissionsFor(permissionGate, rolesFor()),
      dataDependencies: entry?.dataDependencies ?? [],
      legacyAliases: entry?.legacyAliases ?? [],
      permissionGate,
      rolesToExercise: rolesFor(),
      permissionProfiles,
      truthContracts,
      mutationBoundary: mutationBoundary(scenario.kind, scenario.id),
      cleanupExpectation: cleanupExpectation(scenario.kind),
      evidencePath: `scenarios/${scenario.id}/`,
      evidencePaths: recorded?.evidencePaths ?? [],
      verdict: recorded?.verdict ?? 'untested',
      verdictNote: recorded?.note ?? null,
    } satisfies AcceptanceRow;
  });
}

const evidence = loadEvidence();
const scenarioRows = rows(evidence);
const verdictSummary = scenarioRows.reduce<Record<AcceptanceRow['verdict'], number>>(
  (summary, scenario) => {
    summary[scenario.verdict] += 1;
    return summary;
  },
  { passed: 0, partial: 0, blocked: 0, untested: 0 },
);

const ledger = {
  generatedAt: new Date().toISOString(),
  source: {
    globalRules: specificationAuthorities.globalRules,
    executionPlan: specificationAuthorities.currentExecution,
    executionPlanSha256: createHash('sha256').update(planSource).digest('hex'),
    phaseFieldMeaning: 'Historical cutover assignment; deliveryPhases projects the current plan.',
    manifest: 'lib/surfaces/manifest.ts',
    product: 'PRODUCT.md',
    design: 'DESIGN.md',
    navigation: ['lib/navigation/appRoutes.ts', 'lib/navigation/aliases.js', 'next.config.js'],
    inventory: 'docs/page-inventory.md',
  },
  coverage: {
    pageModules: surfaceManifest.length,
    auditedSurfaces: auditedSurfaceOwnership.length,
    scenarios: scenarioLedger.length,
    legacyAliases: new Set(surfaceManifest.flatMap((entry) => entry.legacyAliases)).size,
    rootRedirect: true,
  },
  acceptance: {
    environment: 'Not established by generation; see this run\'s environment and fixture receipts.',
    browser: 'Chromium',
    localMutationBoundary: 'synthetic local only',
    deployedMutationBoundary: 'read-only',
    verdictPolicy: 'blocked or untested scenarios cannot pass',
    scenarioVerdicts: verdictSummary,
    declaredScenarioPass: verdictSummary.passed === scenarioRows.length,
    functionalVerdict: verdictSummary.passed === scenarioRows.length ? 'pass' : 'blocked',
  },
  scenarios: scenarioRows,
  requirements: requirementRows,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`Acceptance ledger written: ${outputPath}`);
console.log(`Coverage: ${ledger.coverage.pageModules} page modules, ${ledger.coverage.auditedSurfaces} audited surfaces, ${ledger.coverage.scenarios} scenarios.`);
console.log(`Scenario verdicts: ${JSON.stringify(verdictSummary)}.`);
