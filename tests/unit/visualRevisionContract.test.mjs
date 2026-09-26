import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { visualRevisionErrors } from '../../scripts/verify-full-app-visual-cutover.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'unauth-revision-p00-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs/product'), { recursive: true });
  const expectation = 'Show the desktop-required notice on unsupported devices.';
  writeFileSync(join(root, 'DESIGN.md'), `# Design\n## Desktop notice\n${expectation}\n`);
  writeFileSync(join(root, 'docs/product/MERCHANT_CLARITY_IMPLEMENTATION.md'), '| F01 | desktop support | P03 |\n');
  writeFileSync(join(root, 'before.txt'), 'Retained before evidence');
  const html = '<main data-screen-label="Desktop required">Desktop required</main>';
  writeFileSync(join(root, 'revised.html'), html);
  const hash = createHash('sha256').update(html).digest('hex');
  const reference = { id: 'Desktop-Required-Clean', revision: { id: 'desktop-notice', designAnchor: 'desktop-notice', requirementIds: ['F01'], expectation, baselineEvidence: 'before.txt', revisedReference: 'revised.html', revisedReferenceSha256: hash, state: 'implemented' } };
  const record = { comparisonBaseline: 'desktop-notice', revisedReferenceSha256: hash, equivalentInputs: true, unaffectedSourceComparisonPassed: true, intentionalVisualDifferences: [expectation] };
  return { root, reference, record };
}

test('unchanged references retain the original comparison', () => {
  assert.deepEqual(visualRevisionErrors({}, { comparisonBaseline: 'original', intentionalVisualDifferences: [] }), []);
  assert.ok(visualRevisionErrors({}, { intentionalVisualDifferences: ['new layout'] }).length);
});

test('a fully registered contract passes metadata checks only', (t) => {
  const { root, reference, record } = fixture(t);
  assert.deepEqual(visualRevisionErrors(reference, record, root), []);
});

test('planning a revision cannot accept revised runtime output', (t) => {
  const { root, reference, record } = fixture(t);
  reference.revision.state = 'planned';
  assert.ok(visualRevisionErrors(reference, record, root).length);
});

test('editing a revised reference invalidates its receipt', (t) => {
  const { root, reference, record } = fixture(t);
  writeFileSync(join(root, 'revised.html'), '<main>Unregistered change</main>');
  assert.ok(visualRevisionErrors(reference, record, root).some((error) => error.includes('hashes')));
});

for (const field of ['equivalentInputs', 'unaffectedSourceComparisonPassed']) {
  test(`revision cannot drop ${field}`, (t) => {
    const { root, reference, record } = fixture(t);
    record[field] = false;
    assert.ok(visualRevisionErrors(reference, record, root).length);
  });
}

test('unknown requirement, missing baseline, changed expectation and an escaping reference fail', (t) => {
  const { root, reference, record } = fixture(t);
  reference.revision.requirementIds = ['F99'];
  reference.revision.baselineEvidence = 'missing.txt';
  reference.revision.revisedReference = '../outside.html';
  reference.revision.expectation = 'Change every page.';
  assert.ok(visualRevisionErrors(reference, record, root).length >= 4);
});

test('the adopted Ramp revision resolves requirements from its landing authority', (t) => {
  const { root, reference, record } = fixture(t);
  reference.owner = '/landing';
  reference.revision.id = record.comparisonBaseline = 'landing-ramp-2026-09-21';
  reference.revision.requirementIds = ['RMP-00', 'RMP-06'];
  writeFileSync(join(root, 'docs/product/LANDING_PRODUCT_LED_IMPLEMENTATION.md'), '| RMP-00 | baseline |\n| RMP-06 | receipt |\n');
  assert.deepEqual(visualRevisionErrors(reference, record, root), []);
  reference.revision.requirementIds = ['RMP-07'];
  assert.ok(visualRevisionErrors(reference, record, root).some((error) => error.includes('requirement IDs')));
});

for (const scope of ['other-owner', 'other-revision']) {
  test(`Ramp authority cannot authorise ${scope}`, (t) => {
    const { root, reference, record } = fixture(t);
    reference.owner = scope === 'other-owner' ? '/pricing' : '/landing';
    reference.revision.id = record.comparisonBaseline = scope === 'other-revision' ? 'unregistered-landing' : 'landing-ramp-2026-09-21';
    reference.revision.requirementIds = ['RMP-00'];
    assert.ok(visualRevisionErrors(reference, record, root).some((error) => error.includes('requirement IDs')));
  });
}
