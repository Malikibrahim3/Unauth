import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) {
  throw new Error('Could not resolve a safe local project_id from supabase/config.toml');
}

const dbContainer = `supabase_db_${projectId}`;
const lifecycle = readFileSync(
  'tests/sql/release1-investigation-lifecycle.sql',
  'utf8',
);
const result = spawnSync(
  'docker',
  ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: [
      '\\set ON_ERROR_STOP on',
      'begin;',
      lifecycle,
      'rollback;',
      '',
    ].join('\n'),
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error(
    `Release 1 investigation runtime acceptance failed with status ${result.status}`,
  );
}
console.log(
  `Release 1 investigation lifecycle runtime passed against ${dbContainer} in a rollback-only transaction.`,
);
