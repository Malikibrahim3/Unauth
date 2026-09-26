import fs from 'node:fs';
import path from 'node:path';

const audit = path.resolve('artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics');
const now = new Date().toISOString();
const backup = path.join(audit, 'continuations', `report-before-${Date.now()}`);
fs.mkdirSync(backup);
for (const name of ['findings.json', 'environment.json', 'report.md', 'resume.md', 'acceptance-ledger.json', 'current-build-evidence.md']) fs.copyFileSync(path.join(audit, name), path.join(backup, name));
const read = name => JSON.parse(fs.readFileSync(path.join(audit, name), 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(audit, name), JSON.stringify(value, null, 2) + '\n');
const build = JSON.parse(fs.readFileSync('artifacts/full-app-acceptance-2026-08-30/build-environment.json', 'utf8'));
const visualRun = 'continuations/visual-55d98df4-f9da-4f74-b254-e34d54fe3388-1788995777832';
const visual = read(`${visualRun}/run.json`);
if (!visual.completedAt || !visual.retainedOrderUnchanged || !visual.runtimeUnchanged) throw new Error('Missing parity preservation receipt.');
const findings = read('findings.json');
findings.buildId = build.buildId;
findings.runtimeSourceFingerprint = build.runtimeSourceFingerprint;
const update = (id, changes) => {
  const item = findings.findings.find(row => row.id === id);
  if (!item) throw new Error(`Missing finding ${id}`);
  Object.assign(item, changes);
  item.evidence = [...new Set([...(item.evidence || []), 'continuation-2026-09-10.md'])];
};
update('UIF-P06-PRIVACY-001', {
  disposition: 'missing-implementation',
  failure: 'The current authenticated POST validates input then unconditionally returns 409 erasure_preview_unavailable. A valid UUID cannot supply the absent reviewed/versioned preview. The historical destructive workflow is not implemented in the current UI/API.',
  correction: 'Preserved safe refusal. Implementing reviewed subject erasure or revising that requirement needs scoped product work; supplying a fixture alone cannot resolve it. Workspace deletion remains separate.',
});
update('UIF-A11Y-001', {
  failure: 'Native Safari now verifies authenticated Cases scrolling, later-row selection and Close. App-wide VoiceOver speech/rotor and verified native 200%/400% zoom remain untested; CSS resizing is not equivalent.',
  verification: 'Prior engine matrix receipts retain their original build. Current Cases Chromium checks and bounded native Safari interaction are separately recorded; no new app-wide accessibility pass is declared.',
});
update('UIF-CONTRAST-001', {
  lifecycle: 'unresolved', disposition: 'visual-contract-review',
  verification: 'Earlier contrast checks passed, but the global #a09b94 to #6f6a63 replacement is outside the fixed palette and lacks a located scoped registration. Source-contrast exception and passing axe do not approve that presentation change.',
});
update('UIF-FIXTURE-001', {
  lifecycle: 'verified-fixed', disposition: 'isolated-fixture-verified',
  correction: `Isolated namespaced fixture passed canonical Asterlane ledger/linkage checks and supported current-build capture. Original conflicting order remained byte-for-byte unchanged; see ${visualRun}/run.json. Existing data was not reassigned or reset.`,
  verification: 'The fixture dependency is resolved for isolated capture. The original retained merchant remains untouched, and visual comparison failures are a separate open gate.',
});
update('UIF-VISUAL-001', {
  failure: 'Current-build parity completed: 79 attempted, 2 matches, 71 comparison differences and 6 capture failures. These mix dynamic data, registered revisions, selector/activation issues and unresolved deviations; they are not 77 independently confirmed product defects.',
  correction: 'Kept strict assertions and old baselines; current parity has a new dated output directory. Resolve equivalent-input/revision-aware comparisons and capture activation contracts before claiming parity.',
  verification: `${visualRun}/parity/reference-parity.json; retained order and runtime fingerprint unchanged after capture.`,
});
for (const item of [
  { id: 'UIF-PAG-001', scenarioId: 'cases-registry', recipeId: 'PAGINATION-COVERAGE', severity: 'P1', lifecycle: 'verified-fixed', disposition: 'verified-fixed', trigger: 'Cases has more than ten loaded rows.', failure: 'Binding rendered ten static source rows while loader pagination advanced by 25, making records unreachable.', correction: 'Repeat supplied templates for every loaded row, isolate row/inspector replacements, and use the actual footer count.', verification: 'Real-tree regression failed before repair and passed after; six focused Jest tests and authenticated viewport checks verified row identity, pagination, wheel scroll, later-row selection, Close and reload.' },
  { id: 'UIF-RLS-001', scenarioId: null, recipeId: 'LOCAL-SEVEN-TABLE-RLS', severity: 'P2', lifecycle: 'unresolved', disposition: 'hardening-review', failure: 'Seven public tables have RLS disabled and zero policies, but anon/authenticated SELECT and INSERT/UPDATE/DELETE privileges are all false.', correction: 'No policy/grant changes. Classify as local RLS hardening/contract concern; browser table exposure and deployed exposure are not established.', verification: 'Read-only pg_class, pg_policies and has_table_privilege results are recorded per table in the continuation.' },
  { id: 'UIF-TEST-CONTRACT-001', scenarioId: 'rule-simulation-and-publication-modals', recipeId: 'LEGACY-WORKFLOW-TRIAGE', severity: 'P2', lifecycle: 'unresolved', disposition: 'test-contract-review', failure: 'Legacy rule test expects rule-editor-canvas and lacks the current impact-preview prerequisite. Legacy decision test selects an absent escalated option. Shopify connection test IDs are absent. These failed; unaffected flow/payload/import checks were subsequently run separately.', correction: 'Preserve failures and modern safeguards. Adapt tests to current product semantics, then verify actual persistence/reversal/publication; do not restore obsolete runtime behavior just to satisfy tests.', verification: 'Dated workflow logs/JSON and decision/Shopify failure screenshots/traces remain available. No passing result is inferred for skipped tests.' },
]) {
  const prior = findings.findings.findIndex(row => row.id === item.id);
  const value = { ...item, evidence: ['continuation-2026-09-10.md'] };
  if (prior >= 0) findings.findings[prior] = value;
  else findings.findings.push(value);
}
save('findings.json', findings);
const environment = read('environment.json');
environment.runtimeHistory = [...(environment.runtimeHistory || []), environment.runtime];
environment.runtime = { ...environment.runtime, buildId: build.buildId, runtimeSourceFingerprint: build.runtimeSourceFingerprint, dirtyTreeFingerprint: build.dirtyTreeFingerprint };
environment.continuation20260910 = { generatedAt: now, report: 'continuation-2026-09-10.md', nativeSafari: 'Authenticated Cases manually verified; audit-owned tab closed and actual size restored.', voiceOver: 'Untested speech/rotor/announcement behavior.', nativeZoom: 'No verified 200%/400% result.', visualRun, retainedOrderUnchanged: true, independentReview: 'open', build: 'passed', typecheck: 'passed', scope: 'Loopback only; no hosted/provider mutation; original worktree and earlier receipts preserved.' };
save('environment.json', environment);
const ledger = read('acceptance-ledger.json');
const counts = ledger.scenarios.reduce((result, row) => { result[row.verdict] = (result[row.verdict] || 0) + 1; return result; }, {});
update('UIF-COVERAGE-001', { failure: `${counts.passed || 0} passed, ${counts.partial || 0} partial, ${counts.blocked || 0} blocked, ${counts.untested || 0} untested of 253. Earlier receipts retain original build identity; wider unexecuted clauses remain open.`, verification: 'Canonical ledger reconciled against dated execution receipts; no whole-app or release-ready pass declared.' });
save('findings.json', findings);
const remaining = ledger.scenarios.filter(row => row.verdict !== 'passed').map(row => ({ id: row.scenarioId, phase: row.phase, verdict: row.verdict, expectedBehaviour: row.expectedBehaviour, activationRecipe: row.activationRecipe, queryState: row.queryState, actions: row.actions, rolesToExercise: row.rolesToExercise, viewport: row.viewport, dependencies: row.dataDependencies, evidence: row.evidencePaths, note: row.verdictNote }));
save('continuations/remaining-2026-09-10.json', { generatedAt: now, buildId: build.buildId, counts, independentReview: 'open', remaining });
const heading = `# Current continuation — 10 September 2026\n\nVerdict: **PARTIAL / NOT READY**. Coverage ledger: **${counts.passed || 0} passed, ${counts.partial || 0} partial, ${counts.blocked || 0} blocked, ${counts.untested || 0} untested / 253**. This is accumulated build-bound coverage, not a fresh all-scenario pass on the repaired build.\n\nCases pagination was repaired and authenticated native Safari is now evidenced. Current parity completed with **2/79 matches**, 71 differences and six capture failures; isolated fixture preparation is resolved. Privacy is a missing implementation, and the seven RLS-disabled tables have browser-role DML grants revoked. Independent review remains open.\n\nBuild: \`${build.buildId}\`; runtime fingerprint: \`${build.runtimeSourceFingerprint}\`. See [continuation details](continuation-2026-09-10.md) and [remaining scenarios](continuations/remaining-2026-09-10.json). Earlier sections below are preserved historical receipts and must not override this update.\n\n---\n\n`;
for (const name of ['report.md', 'resume.md', 'current-build-evidence.md']) fs.writeFileSync(path.join(audit, name), heading + fs.readFileSync(path.join(audit, name), 'utf8'));
const append = (file, value) => fs.appendFileSync(path.join(audit, file), JSON.stringify({ at: now, ...value }) + '\n');
for (const finding of ['UIF-PAG-001', 'UIF-RLS-001', 'UIF-P06-PRIVACY-001', 'UIF-VISUAL-001', 'UIF-A11Y-001', 'UIF-CONTRAST-001']) append('checks.jsonl', { id: `${finding}-2026-09-10`, finding, evidence: 'continuation-2026-09-10.md', buildId: build.buildId });
for (const name of fs.readdirSync(path.join(audit, 'continuations'))) {
  const receiptPath = path.join(audit, 'continuations', name, 'run.json');
  if (!fs.existsSync(receiptPath)) continue;
  const run = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  if (!run.completedAt) continue;
  append('commands.jsonl', { kind: 'continuation-run', receipt: path.relative(audit, receiptPath), buildId: run.buildId || run.build?.buildId, results: run.results || { exitCode: run.exitCode } });
}
console.log(JSON.stringify({ counts, backup: path.relative(audit, backup), remaining: remaining.length }));
