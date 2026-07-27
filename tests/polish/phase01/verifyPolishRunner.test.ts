/**
 * Phase 1 deliverable 8 — the fail-closed `verify:polish` runner (§3.5).
 *
 * The runner is itself a gate, so its failure modes are asserted directly:
 * a runner that silently passes on a missing manifest, an unaccounted owned ID,
 * or a zero-test selection would let every later phase claim completion without
 * evidence.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RUNNER = 'scripts/verify-polish.mjs';
const MANIFEST = 'scripts/polish/phase-01.manifest.mjs';
const SPEC = 'docs/IMPL_product_polish_and_screenshot_readiness.md';

function runRunner(args: string[], cwd = process.cwd()) {
  return spawnSync('node', [join(process.cwd(), RUNNER), ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

describe('verify:polish argument contract', () => {
  it('rejects an unrecognised argument', () => {
    const result = runRunner(['--everything']);
    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toMatch(/Unrecognised argument/);
  });

  it('rejects combining --phase and --through', () => {
    const result = runRunner(['--phase=01', '--through=01']);
    expect(result.status).not.toBe(0);
    expect(`${result.stderr}${result.stdout}`).toMatch(/Exactly one of/);
  });

  it('rejects no mode at all', () => {
    const result = runRunner([]);
    expect(result.status).not.toBe(0);
  });

  it('fails closed when a requested phase manifest does not exist', () => {
    const result = runRunner(['--phase=13']);
    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toMatch(/phase-13\.manifest\.mjs does not exist/);
  });
});

/**
 * The manifest is an ES module and the Jest runtime is CommonJS, so it is read
 * through a short-lived Node process rather than a `require` interop shim.
 */
function loadManifest() {
  const result = spawnSync(
    'node',
    ['--input-type=module', '-e', `import m from './${MANIFEST}'; console.log(JSON.stringify(m));`],
    { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout) as {
    ownedIds: string[];
    report: string;
    checks: Array<Record<string, unknown>>;
  };
}

describe('verify:polish phase 1 manifest', () => {
  const manifest = loadManifest();

  it('owns exactly the 21 RUN IDs the ledger assigns to phase 1', () => {
    expect(manifest.ownedIds).toHaveLength(21);
    expect(manifest.ownedIds[0]).toBe('RUN-01');
    expect(manifest.ownedIds[20]).toBe('RUN-21');
    expect(new Set(manifest.ownedIds).size).toBe(21);
  });

  it('matches the owned-ID count recorded in the specification ledger', () => {
    const spec = readFileSync(SPEC, 'utf8');
    const row = spec.split('\n').find((line) => /^\|\s*1\s*\|\s*RUN-01–RUN-21/.test(line));
    expect(row).toBeDefined();
    expect(row).toContain('| 21 |');
    expect(row).toContain(manifest.report);
  });

  it('covers every command listed in the §4.2 focused completion gate', () => {
    const commands = manifest.checks
      .filter((check: { command?: string; args?: string[] }) => check.command === 'npm')
      .map((check: { args: string[] }) => check.args[check.args.indexOf('run') + 1]);
    for (const required of [
      'audit:supabase-contract',
      'verify:canonical-db',
      'verify:durable-audit-runtime',
      'verify:tenant-boundaries',
      'verify:investigations-runtime',
      'verify:source-to-recovery',
      'verify:p0-ledger',
      'verify:rollout-rehearsal',
      'smoke:reconciliation',
    ]) {
      expect(commands).toContain(required);
    }
    // §4.2 requires the canonical replay twice, from clean databases.
    expect(commands.filter((name: string) => name === 'verify:canonical-db')).toHaveLength(2);
  });

  it('never invokes release:readiness, which would recurse', () => {
    expect(JSON.stringify(manifest)).not.toContain('release:readiness');
  });

  it('declares a non-empty selection for every jest check', () => {
    const jestChecks = manifest.checks.filter((check: { kind?: string }) => check.kind === 'jest');
    expect(jestChecks.length).toBeGreaterThan(0);
    for (const check of jestChecks) {
      expect(Array.isArray(check.args) && check.args.length).toBeTruthy();
    }
  });

  it('declares every §4.2 non-command proof as a required artifact', () => {
    const artifacts = manifest.checks
      .filter((check: { kind?: string }) => check.kind === 'artifact')
      .map((check: { path: string }) => check.path);
    expect(artifacts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('read-purity'),
        expect.stringContaining('route-performance'),
        expect.stringContaining('completeness-injection'),
        expect.stringContaining('browser-runtime'),
        expect.stringContaining('fixture-matrix'),
      ]),
    );
  });
});

describe('verify:polish fails closed on a defective phase', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'verify-polish-'));
    mkdirSync(join(workdir, 'scripts/polish'), { recursive: true });
    mkdirSync(join(workdir, 'docs/phase-reports/product-polish'), { recursive: true });
    mkdirSync(join(workdir, 'docs'), { recursive: true });
    copyFileSync(SPEC, join(workdir, SPEC));
  });

  afterEach(() => rmSync(workdir, { recursive: true, force: true }));

  function writeManifest(body: string) {
    writeFileSync(join(workdir, 'scripts/polish/phase-01.manifest.mjs'), body);
  }

  function writeReport(body: string) {
    writeFileSync(join(workdir, 'docs/phase-reports/product-polish/phase-01.md'), body);
  }

  const passingReport = (ids: string[]) =>
    [
      '# Product polish — Phase 1 completion report',
      '',
      '- Status: COMPLETE',
      `- Owned-ID result: ${ids.length}/${ids.length} PASS`,
      '',
      '| ID | Implemented change | Verification evidence | Result |',
      '|---|---|---|---|',
      ...ids.map((id) => `| ${id} | change | evidence | PASS |`),
      '',
      '## Remaining issues',
      '',
      'None.',
      '',
    ].join('\n');

  const trivialManifest = (ids: string[]) => `export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ${JSON.stringify(ids)},
  checks: [{ name: 'noop', command: 'node', args: ['-e', '0'] }],
};
`;

  // The ledger row for phase 1 owns 21 IDs, so a well-formed fixture must too.
  const ALL_RUN_IDS = Array.from({ length: 21 }, (_, index) => `RUN-${String(index + 1).padStart(2, '0')}`);

  it('passes a well-formed phase', () => {
    writeManifest(trivialManifest(ALL_RUN_IDS));
    writeReport(passingReport(ALL_RUN_IDS));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.stdout).toContain('READY');
    expect(result.status).toBe(0);
  });

  it('fails when the manifest owns fewer IDs than the specification ledger', () => {
    writeManifest(trivialManifest(['RUN-01']));
    writeReport(passingReport(['RUN-01']));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/ledger owns 21 IDs, manifest declares 1/);
  });

  it('fails when an owned ID has no requirement row', () => {
    writeManifest(trivialManifest(['RUN-01', 'RUN-02']));
    writeReport(passingReport(['RUN-01', 'RUN-02']).replace('| RUN-02 | change | evidence | PASS |\n', ''));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/no requirement-ledger row for owned ID RUN-02/);
  });

  it('refuses a PARTIAL result', () => {
    writeManifest(trivialManifest(['RUN-01']));
    writeReport(passingReport(['RUN-01']).replace('| PASS |', '| PARTIAL |'));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/RUN-01 is recorded as "PARTIAL"/);
  });

  it('refuses a report whose X/X figure disagrees with the owned-ID count', () => {
    writeManifest(trivialManifest(['RUN-01', 'RUN-02']));
    writeReport(passingReport(['RUN-01', 'RUN-02']).replace('2/2 PASS', '1/1 PASS'));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/missing the exact owned-ID result line "2\/2 PASS"/);
  });

  it('refuses a report that still has unresolved remaining issues', () => {
    writeManifest(trivialManifest(['RUN-01']));
    writeReport(passingReport(['RUN-01']).replace('None.', 'The browser sweep has not been run.'));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/"Remaining issues" is not exactly "None\."/);
  });

  it('refuses a skipped check', () => {
    writeManifest(`export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01'],
  checks: [{ name: 'noop', command: 'node', args: ['-e', '0'], skip: true }],
};
`);
    writeReport(passingReport(['RUN-01']));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/checks may not be skipped/);
  });

  it('refuses a manifest that shells out to release:readiness', () => {
    writeManifest(`export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01'],
  checks: [{ name: 'recursive', command: 'npm', args: ['run', 'release:readiness'] }],
};
`);
    writeReport(passingReport(['RUN-01']));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/must not invoke release:readiness/);
  });

  it('refuses a failing command', () => {
    writeManifest(`export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01'],
  checks: [{ name: 'boom', command: 'node', args: ['-e', 'process.exit(3)'] }],
};
`);
    writeReport(passingReport(['RUN-01']));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/boom: node .* exited 3/);
  });

  it('refuses a jest filter that selects zero tests', () => {
    writeManifest(`export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01'],
  checks: [{ name: 'empty selection', kind: 'jest', args: ['tests/does-not-exist/nothing.test.ts'] }],
};
`);
    writeReport(passingReport(['RUN-01']));
    // Run from the repository root so jest resolves, but point the filter at a
    // path that matches nothing: an empty selection is a failure, not a pass.
    copyFileSync(
      join(workdir, 'scripts/polish/phase-01.manifest.mjs'),
      join(process.cwd(), 'scripts/polish/phase-99.manifest.mjs'),
    );
    try {
      const result = runRunner(['--phase=01'], workdir);
      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toMatch(/selected zero tests|could not resolve the test selection/);
    } finally {
      rmSync(join(process.cwd(), 'scripts/polish/phase-99.manifest.mjs'), { force: true });
    }
  });

  it('refuses a missing or empty required artifact', () => {
    writeManifest(`export default {
  phase: 1,
  report: 'docs/phase-reports/product-polish/phase-01.md',
  ownedIds: ['RUN-01'],
  checks: [{ name: 'evidence', kind: 'artifact', path: 'docs/evidence/absent.json' }],
};
`);
    writeReport(passingReport(['RUN-01']));
    const result = runRunner(['--phase=01'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/required artifact docs\/evidence\/absent\.json does not exist/);
  });

  it('refuses a ledger that marks a phase COMPLETE without a manifest', () => {
    const spec = readFileSync(join(workdir, SPEC), 'utf8').replace(
      /^(\| 2 \| SEED-01–SEED-28 \| 28 \|[^|]*\|[^|]*\| )NOT STARTED( \|)/m,
      '$1COMPLETE$2',
    );
    writeFileSync(join(workdir, SPEC), spec);
    const result = runRunner(['--ledger'], workdir);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/phase 2 is COMPLETE but scripts\/polish\/phase-02\.manifest\.mjs does not exist/);
  });
});
