import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COPY_EXCEPTIONS, scanSource } from '../../scripts/verify-merchant-copy.mjs';

test('reviewed reference/schema literals pass only for the exact inspected file bytes', () => {
  for (const exception of COPY_EXCEPTIONS) {
    const source = readFileSync(exception.file, 'utf8');
    assert.deepEqual(scanSource(exception.file, source), [], exception.file);
    assert.ok(scanSource('components/unreviewed.tsx', source).length > 0);
    assert.ok(scanSource(exception.file, source + '\nconst added = "claim history";').length > 0);
    assert.ok(scanSource(exception.file, source + '\n').length > 0, 'any source change invalidates its reviewed exception');
  }
});
test('prohibitions stay active within reviewed directories and detect every match on one line', () => {
  assert.equal(scanSource('components/visual-authority/generated/New.tsx', '"claim history"; "Amount (minor)"; "dry-run"').length, 3);
  assert.equal(scanSource('components/imports/Other.tsx', '"minor units"').length, 1);
  assert.equal(scanSource('components/example.tsx', '"claim history"; "claim history"').length, 2);
});
test('comments do not become merchant copy and output stays bounded', () => {
  assert.deepEqual(scanSource('components/example.tsx', '// claim history\n/* dry-run */\n"Case history"'), []);
  const violations = scanSource('components/example.tsx', 'x'.repeat(50000) + ' claim history ' + 'y'.repeat(50000));
  assert.equal(violations.length, 1);
  assert.ok(violations[0].length < 350);
});
