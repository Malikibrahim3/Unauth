import fs from 'node:fs';
import path from 'node:path';
import { ACCEPTANCE_ROOT } from './acceptance/local-runtime.mjs';

const root = path.join(process.cwd(), process.env.FULL_APP_ACCEPTANCE_ROOT?.trim() || ACCEPTANCE_ROOT);
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'acceptance-ledger.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(root, 'physical', 'scenario-evidence-index.json'), 'utf8'));
const failures = [];
const canonicalRoles = ['owner', 'admin', 'analyst', 'viewer'];
const requiredReceiptFields = ['scenarioId', 'declaredKind', 'activation', 'viewport', 'theme', 'roleProfile', 'finalUrl', 'consoleErrors', 'pageErrors', 'failedRequests', 'screenshotOrTrace', 'mutationReceipt', 'cleanup', 'verdict'];
const buildReceiptPath = path.join(root, 'build-environment.json');
const build = fs.existsSync(buildReceiptPath) ? JSON.parse(fs.readFileSync(buildReceiptPath, 'utf8')) : null;

// These counts are the current executable manifest baseline, including the
// supplied File-Claim surface. Keep this validator aligned with the manifest
// rather than silently dropping a mapped route to satisfy historical totals.
if (ledger.coverage?.scenarios !== 223 || ledger.scenarios?.length !== 223) failures.push(`Expected 223 scenarios; received ${ledger.scenarios?.length ?? 0}`);
if (ledger.coverage?.pageModules !== 65) failures.push(`Expected 65 page modules; received ${ledger.coverage?.pageModules}`);
if (ledger.coverage?.auditedSurfaces !== 120) failures.push(`Expected 120 audited surfaces; received ${ledger.coverage?.auditedSurfaces}`);

for (const scenario of ledger.scenarios ?? []) {
  if (JSON.stringify(scenario.rolesToExercise) !== JSON.stringify(canonicalRoles)) {
    failures.push(`${scenario.scenarioId}: rolesToExercise is not the canonical four-role list`);
  }
  for (const profile of scenario.permissionProfiles ?? []) {
    if (!canonicalRoles.includes(profile.role)) failures.push(`${scenario.scenarioId}: profile ${profile.id} uses non-canonical role ${profile.role}`);
  }
  const indexed = index.scenarios?.[scenario.scenarioId];
  if (scenario.verdict === 'untested') continue;
  if (!indexed) {
    failures.push(`${scenario.scenarioId}: non-untested row has no evidence-index entry`);
    continue;
  }
  if (indexed.verdict !== scenario.verdict) failures.push(`${scenario.scenarioId}: ledger/index verdict mismatch`);
  if (!Array.isArray(scenario.evidencePaths) || scenario.evidencePaths.length === 0) failures.push(`${scenario.scenarioId}: evidencePaths is empty`);
  for (const evidencePath of scenario.evidencePaths ?? []) {
    const resolved = path.resolve(root, evidencePath);
    if (!resolved.startsWith(`${root}${path.sep}`)) failures.push(`${scenario.scenarioId}: evidence path escapes artifact root`);
    else if (!fs.existsSync(resolved)) failures.push(`${scenario.scenarioId}: missing ${evidencePath}`);
  }
  const receiptPath = `scenarios/${scenario.scenarioId}/receipt.json`;
  if (!scenario.evidencePaths.includes(receiptPath) || !fs.existsSync(path.join(root, receiptPath))) {
    failures.push(`${scenario.scenarioId}: missing isolated scenario receipt`);
    continue;
  }
  const receipt = JSON.parse(fs.readFileSync(path.join(root, receiptPath), 'utf8'));
  for (const field of requiredReceiptFields) {
    if (!(field in receipt)) failures.push(`${scenario.scenarioId}: receipt omits ${field}`);
  }
  if (receipt.scenarioId !== scenario.scenarioId || receipt.declaredKind !== scenario.kind || receipt.verdict !== scenario.verdict) {
    failures.push(`${scenario.scenarioId}: receipt identity/kind/verdict mismatch`);
  }
  if (scenario.verdict === 'passed') {
    if ((receipt.consoleErrors ?? []).length || (receipt.pageErrors ?? []).length || (receipt.failedRequests ?? []).length) {
      failures.push(`${scenario.scenarioId}: passing receipt contains runtime errors`);
    }
    if (['state', 'loading', 'error', 'not-found', 'overlay'].includes(scenario.kind)) {
      const localProof = (scenario.evidencePaths ?? []).some((evidencePath) => evidencePath.startsWith(`scenarios/${scenario.scenarioId}/`) && evidencePath !== receiptPath);
      if (!localProof || !receipt.screenshotOrTrace) failures.push(`${scenario.scenarioId}: passing ${scenario.kind} row lacks independent scenario proof`);
    }
    if (receipt.evidenceLineage) {
      if (!build?.buildId || !build?.dirtyTreeFingerprint) failures.push(`${scenario.scenarioId}: lineage exists without canonical build identity`);
      if (receipt.buildId !== build?.buildId || receipt.dirtyTreeFingerprint !== build?.dirtyTreeFingerprint) {
        failures.push(`${scenario.scenarioId}: promoted receipt build identity does not match canonical build`);
      }
      if (receipt.evidenceLineage.buildId !== build?.buildId || receipt.evidenceLineage.dirtyTreeFingerprint !== build?.dirtyTreeFingerprint) {
        failures.push(`${scenario.scenarioId}: promoted evidence lineage does not match canonical build`);
      }
    }
  }
}

if (failures.length) {
  console.error(`FAIL full acceptance evidence (${failures.length} issues)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PASS full acceptance evidence structure: ${ledger.scenarios.length} manifest scenarios; verdict ${ledger.acceptance.functionalVerdict}`);
