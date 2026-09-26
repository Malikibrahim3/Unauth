import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { verifyGlobalAuthority } from '../../scripts/verify-authority-map.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'unauth-authority-p00-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'ARCHITECTURE.md', 'PRODUCT.md', 'DESIGN.md', 'GLOBAL_RULES.md', 'docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md']) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), readFileSync(resolve(file)));
  }
  return root;
}

test('the currently adopted entry points and owner cells are connected', (t) => {
  assert.deepEqual(verifyGlobalAuthority(fixture(t)), []);
});

test('an unrelated global-rules heading cannot replace the IDE read instruction', (t) => {
  const root = fixture(t);
  const file = join(root, 'AGENTS.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('Read [GLOBAL_RULES.md](GLOBAL_RULES.md) completely before every task.', '# GLOBAL_RULES.md'));
  assert.ok(verifyGlobalAuthority(root).some((error) => error.includes('must require reading')));
  assert.ok(verifyGlobalAuthority(root).some((error) => error.includes('must link directly')));
});

for (const file of ['GLOBAL_RULES.md', 'docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md']) {
  test(`a missing ${file} fails even while its index entry remains`, (t) => {
    const root = fixture(t);
    unlinkSync(join(root, file));
    assert.ok(verifyGlobalAuthority(root).some((error) => error.includes('missing required owner')));
  });
  test(`${file} in a projection column cannot stand in for its owner registration`, (t) => {
    const root = fixture(t);
    const path = join(root, 'ARCHITECTURE.md');
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll(`| \`${file}\` |`, `| Unassigned | Mention \`${file}\`.`));
    assert.ok(verifyGlobalAuthority(root).some((error) => error.includes(`register ${file} in the binding owner column`)));
  });
}

test('a commented-out or code-example import does not wire Claude to the rules', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'CLAUDE.md'), '@AGENTS.md\n<!--\n@GLOBAL_RULES.md\n-->\n```\n@GLOBAL_RULES.md\n```\n');
  assert.ok(verifyGlobalAuthority(root).some((error) => error.includes('CLAUDE.md must import @GLOBAL_RULES.md')));
});

test('a domain link redirected to historical evidence fails', (t) => {
  const root = fixture(t);
  const path = join(root, 'PRODUCT.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('(GLOBAL_RULES.md)', '(historical-rules.md)'));
  assert.ok(verifyGlobalAuthority(root).some((error) => error.includes('PRODUCT.md must link directly')));
});

function generateWithEvidence(root, evidence) {
  const input = join(root, 'evidence.json');
  const output = join(root, 'ledger.json');
  writeFileSync(input, evidence);
  const result = spawnSync(resolve('node_modules/.bin/ts-node'), [
    '--transpile-only', '-r', 'tsconfig-paths/register', '--compiler-options',
    '{"module":"commonjs","moduleResolution":"node"}',
    'scripts/generate-full-acceptance-ledger.ts', `--evidence=${input}`, `--out=${output}`,
  ], { encoding: 'utf8' });
  return { result, output };
}

test('the acceptance CLI consumes its explicit evidence argument', (t) => {
  const { result, output } = generateWithEvidence(fixture(t), JSON.stringify({ scenarios: {
    pricing: { verdict: 'partial', note: 'Synthetic CLI regression fixture, not runtime proof.' },
  } }));
  assert.equal(result.status, 0, result.stderr);
  const ledger = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(ledger.scenarios.find((scenario) => scenario.scenarioId === 'pricing').verdict, 'partial');
  assert.ok(ledger.requirements.every((requirement) => requirement.verdict === 'untested'));
});

test('a passing receipt cannot certify a planned replacement scenario', (t) => {
  const { result, output } = generateWithEvidence(fixture(t), JSON.stringify({ scenarios: {
    'replacement-authorisation': { verdict: 'passed' },
  } }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Planned scenario replacement-authorisation cannot inherit a passing receipt/);
  assert.equal(existsSync(output), false);
});

test('malformed explicit evidence fails instead of silently generating an empty ledger', (t) => {
  const { result, output } = generateWithEvidence(fixture(t), '{invalid');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Could not load acceptance evidence/);
  assert.equal(existsSync(output), false);
});
