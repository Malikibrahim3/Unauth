/**
 * Fail-closed phase verifier for
 * docs/IMPL_product_polish_and_screenshot_readiness.md (§3.5).
 *
 * Modes:
 *   --phase=NN    run exactly one phase manifest
 *   --through=NN  run phases 1..NN in order
 *   --ledger      reconcile the specification ledger with the manifests that
 *                 exist, then run --through=<highest COMPLETE phase>
 *
 * The runner never invokes release:readiness; release:readiness invokes it.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SPEC = 'docs/IMPL_product_polish_and_screenshot_readiness.md';
const MANIFEST_DIR = 'scripts/polish';
const FORBIDDEN_CHECK_ARGS = ['release:readiness', 'release-readiness.mjs'];

const failures = [];
const passes = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function pass(message) {
  passes.push(message);
  console.log(`PASS ${message}`);
}

function parseArgs(argv) {
  const options = { phase: null, through: null, ledger: false };
  for (const arg of argv) {
    const phase = arg.match(/^--phase=(\d{1,2})$/);
    const through = arg.match(/^--through=(\d{1,2})$/);
    if (phase) options.phase = Number(phase[1]);
    else if (through) options.through = Number(through[1]);
    else if (arg === '--ledger') options.ledger = true;
    else throw new Error(`Unrecognised argument ${arg}. Use --phase=NN, --through=NN or --ledger.`);
  }
  const selected = [options.phase !== null, options.through !== null, options.ledger].filter(Boolean);
  if (selected.length !== 1) {
    throw new Error('Exactly one of --phase=NN, --through=NN or --ledger is required.');
  }
  return options;
}

function manifestPath(phase) {
  return `${MANIFEST_DIR}/phase-${String(phase).padStart(2, '0')}.manifest.mjs`;
}

/**
 * Reads the §3.3 ownership ledger. The ledger is the specification's own record
 * of which phases claim completion, so it is the only safe source for deciding
 * what release:readiness must re-verify.
 */
function readLedger() {
  if (!existsSync(SPEC)) throw new Error(`Specification ${SPEC} is missing`);
  const rows = [];
  for (const line of readFileSync(SPEC, 'utf8').split('\n')) {
    const match = line.match(/^\|\s*(\d{1,2})\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|[^|]*\|[^|]*\|\s*([A-Z ]+?)\s*\|\s*`?([^|`]+?)`?\s*\|\s*$/);
    if (!match) continue;
    rows.push({
      phase: Number(match[1]),
      ownedRanges: match[2],
      ownedCount: Number(match[3]),
      status: match[4].trim(),
      report: match[5].trim(),
    });
  }
  if (rows.length !== 13) {
    throw new Error(`Expected 13 ledger rows in ${SPEC}, parsed ${rows.length}`);
  }
  return rows;
}

async function loadManifest(phase) {
  const path = manifestPath(phase);
  if (!existsSync(path)) throw new Error(`Phase ${phase} manifest ${path} does not exist`);
  const loaded = await import(pathToFileURL(resolve(path)).href);
  const manifest = loaded.default;
  if (!manifest || typeof manifest !== 'object') throw new Error(`${path} has no default-exported manifest`);
  if (manifest.phase !== phase) throw new Error(`${path} declares phase ${manifest.phase}, expected ${phase}`);
  if (!Array.isArray(manifest.ownedIds) || manifest.ownedIds.length === 0) {
    throw new Error(`${path} declares no owned IDs`);
  }
  const duplicates = manifest.ownedIds.filter((id, index) => manifest.ownedIds.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${path} duplicates owned IDs: ${[...new Set(duplicates)].join(', ')}`);
  if (!Array.isArray(manifest.checks) || manifest.checks.length === 0) {
    throw new Error(`${path} declares no checks`);
  }
  const names = manifest.checks.map((check) => check.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicateNames.length) throw new Error(`${path} duplicates check names: ${[...new Set(duplicateNames)].join(', ')}`);
  if (typeof manifest.report !== 'string' || !manifest.report) throw new Error(`${path} declares no report path`);
  return manifest;
}

/**
 * Validates the ledger row and completion report for a phase. §3.6 requires the
 * report to account for every owned ID with a PASS result and to state the exact
 * X/X figure, so anything softer than that is a runner failure.
 */
function verifyReport(manifest, ledgerRow) {
  const label = `phase ${manifest.phase} report`;
  if (!existsSync(manifest.report)) {
    fail(`${label}: ${manifest.report} does not exist`);
    return;
  }
  if (statSync(manifest.report).size === 0) {
    fail(`${label}: ${manifest.report} is empty`);
    return;
  }
  const report = readFileSync(manifest.report, 'utf8');

  if (ledgerRow && ledgerRow.report !== manifest.report) {
    fail(`${label}: ledger points at ${ledgerRow.report}, manifest at ${manifest.report}`);
  }
  if (ledgerRow && ledgerRow.ownedCount !== manifest.ownedIds.length) {
    fail(`${label}: ledger owns ${ledgerRow.ownedCount} IDs, manifest declares ${manifest.ownedIds.length}`);
  }

  const expected = `${manifest.ownedIds.length}/${manifest.ownedIds.length} PASS`;
  if (!report.includes(expected)) {
    fail(`${label}: missing the exact owned-ID result line "${expected}"`);
  }
  if (!/^- Status: COMPLETE$/m.test(report)) {
    fail(`${label}: status line is not "COMPLETE"`);
  }

  // Every owned ID needs exactly one requirement-ledger row ending in PASS.
  const rows = new Map();
  for (const line of report.split('\n')) {
    const match = line.match(/^\|\s*([A-Z0-9]+-\d{2})\s*\|.*\|\s*([A-Z ]+?)\s*\|\s*$/);
    if (!match) continue;
    const [, id, result] = match;
    if (rows.has(id)) fail(`${label}: duplicate requirement row for ${id}`);
    rows.set(id, result.trim());
  }
  for (const id of manifest.ownedIds) {
    const result = rows.get(id);
    if (!result) {
      fail(`${label}: no requirement-ledger row for owned ID ${id}`);
    } else if (result !== 'PASS') {
      fail(`${label}: ${id} is recorded as "${result}", not PASS`);
    }
  }
  const unowned = [...rows.keys()].filter((id) => !manifest.ownedIds.includes(id));
  if (unowned.length) {
    fail(`${label}: reports IDs it does not own: ${unowned.join(', ')}`);
  }

  for (const marker of ['NOT VERIFIED', 'PARTIAL', 'NOT RUN', 'TODO', 'FIXME']) {
    if (report.includes(marker)) fail(`${label}: contains unresolved marker "${marker}"`);
  }
  if (!/^## Remaining issues\s*\n+None\.\s*$/m.test(report)) {
    fail(`${label}: "Remaining issues" is not exactly "None."`);
  }
  if (!failures.some((message) => message.startsWith(label))) {
    pass(`${label} accounts for ${manifest.ownedIds.length}/${manifest.ownedIds.length} owned IDs`);
  }
}

function runCommand(name, command, args, env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...env },
  });
  if (result.error) {
    fail(`${name}: ${command} could not be executed (${result.error.message})`);
    return false;
  }
  if (result.status !== 0) {
    fail(`${name}: ${command} ${args.join(' ')} exited ${result.status}`);
    return false;
  }
  return true;
}

/**
 * A jest filter that selects nothing is a failure, not a pass (§3.5). Resolve
 * the selection with --listTests before running it.
 */
function runJestCheck(check) {
  const listed = spawnSync('npx', ['jest', '--listTests', ...check.args], {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (listed.status !== 0) {
    fail(`${check.name}: could not resolve the test selection (${(listed.stderr || '').trim().split('\n').pop()})`);
    return;
  }
  const files = listed.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  if (files.length === 0) {
    fail(`${check.name}: the test filter selected zero tests`);
    return;
  }
  if (check.minTestFiles && files.length < check.minTestFiles) {
    fail(`${check.name}: selected ${files.length} test files, manifest requires at least ${check.minTestFiles}`);
    return;
  }
  if (runCommand(check.name, 'npx', ['jest', '--runInBand', ...check.args])) {
    pass(`${check.name} (${files.length} test files)`);
  }
}

function runArtifactCheck(check) {
  if (!existsSync(check.path)) {
    fail(`${check.name}: required artifact ${check.path} does not exist`);
    return;
  }
  const size = statSync(check.path).size;
  if (size === 0) {
    fail(`${check.name}: required artifact ${check.path} is empty`);
    return;
  }
  if (check.mustContain) {
    const body = readFileSync(check.path, 'utf8');
    const missing = check.mustContain.filter((needle) => !body.includes(needle));
    if (missing.length) {
      fail(`${check.name}: ${check.path} is missing ${missing.map((value) => JSON.stringify(value)).join(', ')}`);
      return;
    }
  }
  if (check.maxAgeDays) {
    const ageDays = (Date.now() - statSync(check.path).mtimeMs) / 86_400_000;
    if (ageDays > check.maxAgeDays) {
      fail(`${check.name}: ${check.path} is stale (${ageDays.toFixed(1)} days old)`);
      return;
    }
  }
  pass(`${check.name} (${check.path}, ${size} bytes)`);
}

async function runPhase(phase, ledger) {
  let manifest;
  try {
    manifest = await loadManifest(phase);
  } catch (error) {
    fail(`phase ${phase} manifest: ${error.message}`);
    return;
  }
  console.log(`\n── Phase ${String(phase).padStart(2, '0')} — ${manifest.ownedIds.length} owned IDs ──`);

  for (const check of manifest.checks) {
    if (!check.name) {
      fail(`phase ${phase}: a check has no name`);
      continue;
    }
    const serialised = JSON.stringify(check);
    const forbidden = FORBIDDEN_CHECK_ARGS.find((needle) => serialised.includes(needle));
    if (forbidden) {
      fail(`${check.name}: manifests must not invoke ${forbidden}`);
      continue;
    }
    if (check.skip) {
      fail(`${check.name}: checks may not be skipped`);
      continue;
    }
    if (check.kind === 'jest') {
      if (!Array.isArray(check.args) || check.args.length === 0) {
        fail(`${check.name}: jest check declares no selection`);
        continue;
      }
      runJestCheck(check);
      continue;
    }
    if (check.kind === 'artifact') {
      runArtifactCheck(check);
      continue;
    }
    if (!check.command || !Array.isArray(check.args)) {
      fail(`${check.name}: check declares no command`);
      continue;
    }
    if (runCommand(check.name, check.command, check.args, check.env)) pass(check.name);
  }

  verifyReport(manifest, ledger.find((row) => row.phase === phase) ?? null);
}

function reconcileLedger(ledger) {
  const available = new Set(
    readdirSync(MANIFEST_DIR)
      .map((file) => file.match(/^phase-(\d{2})\.manifest\.mjs$/))
      .filter(Boolean)
      .map((match) => Number(match[1])),
  );
  const complete = ledger.filter((row) => row.status === 'COMPLETE').map((row) => row.phase);
  for (const phase of complete) {
    if (!available.has(phase)) {
      fail(`ledger reconciliation: phase ${phase} is COMPLETE but ${manifestPath(phase)} does not exist`);
    }
  }
  const highest = complete.length ? Math.max(...complete) : 0;
  // A COMPLETE phase may not sit above an incomplete one: --through must be able
  // to replay an unbroken 1..N chain.
  for (let phase = 1; phase <= highest; phase += 1) {
    if (!complete.includes(phase)) {
      fail(`ledger reconciliation: phase ${highest} is COMPLETE but earlier phase ${phase} is ${ledger.find((row) => row.phase === phase).status}`);
    }
  }
  if (!failures.length) {
    pass(`ledger reconciliation (highest COMPLETE phase: ${highest || 'none'})`);
  }
  return highest;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ledger = readLedger();

  let phases = [];
  if (options.phase !== null) {
    phases = [options.phase];
  } else if (options.through !== null) {
    phases = Array.from({ length: options.through }, (_, index) => index + 1);
  } else {
    const highest = reconcileLedger(ledger);
    phases = Array.from({ length: highest }, (_, index) => index + 1);
    if (phases.length === 0) {
      console.log('No phase is marked COMPLETE; nothing to replay.');
    }
  }

  for (const phase of phases) {
    // eslint-disable-next-line no-await-in-loop -- phases are ordered and must not overlap
    await runPhase(phase, ledger);
  }

  console.log(
    `\n${failures.length ? 'BLOCKED' : 'READY'} — ${passes.length} passed, ${failures.length} failed`,
  );
  if (failures.length) {
    for (const message of failures) console.error(`  · ${message}`);
  }
  process.exitCode = failures.length ? 1 : 0;
}

await main();
