import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Could not resolve a safe local project_id from supabase/config.toml');
const dbContainer = process.env.LOSS_DESK_DB_CONTAINER ?? `supabase_db_${projectId}`;
if (!/^supabase_db_[A-Za-z0-9_-]+$/.test(dbContainer)) throw new Error('Unsafe loss-desk database container name.');

const result = spawnSync(
  'docker',
  ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: readFileSync('tests/integration/loss_desk_durable_capabilities.sql', 'utf8'),
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  },
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error(`Loss-desk durable capability proof failed with status ${result.status}`);
}
console.log(`Loss-desk durable capabilities passed against ${dbContainer}.`);
