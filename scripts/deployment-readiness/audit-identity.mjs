import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('reports/deployment-readiness/benchmarks');
fs.mkdirSync(outDir, { recursive: true });

const args = [
  'jest',
  'tests/engine/linker.test.ts',
  'tests/engine/identityScoring.test.ts',
  'tests/engine/identityMatchGating.test.ts',
  'tests/identity/scoringModel.blind.test.ts',
  '--runInBand',
];

const result = spawnSync('npx', args, { encoding: 'utf8' });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
fs.writeFileSync(path.join(outDir, 'identity-jest-output.txt'), output);

const summary = {
  command: `npx ${args.join(' ')}`,
  exitCode: result.status,
  passed: result.status === 0,
  outputFile: 'identity-jest-output.txt',
};

fs.writeFileSync(path.join(outDir, 'identity-test-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

// Audit command is evidence-gathering, not a CI gate. The failure is recorded
// in the report file and final readiness report.
process.exitCode = 0;
