import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

it('invalidates receipts when an already-dirty runtime file changes, without hashing environment secrets', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'unauth-source-fingerprint-test-'));
  const helper = pathToFileURL(path.resolve('scripts/acceptance/local-runtime.mjs')).href;
  const fingerprint = () => execFileSync(process.execPath, ['--input-type=module', '-e', `import { runtimeSourceFingerprint } from ${JSON.stringify(helper)}; process.stdout.write(runtimeSourceFingerprint(${JSON.stringify(directory)}));`], { encoding: 'utf8' });
  try {
    mkdirSync(path.join(directory, 'app'));
    writeFileSync(path.join(directory, 'app', 'page.tsx'), 'export default () => "before"');
    const before = fingerprint();
    writeFileSync(path.join(directory, '.env.local'), 'EXAMPLE_TEST_SECRET=not-a-real-secret');
    expect(fingerprint()).toBe(before);
    writeFileSync(path.join(directory, 'app', 'page.tsx'), 'export default () => "after"');
    expect(fingerprint()).not.toBe(before);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
