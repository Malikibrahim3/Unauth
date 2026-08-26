/**
 * RUN-01 deploy preflight.
 *
 * Compares the relations, columns and foreign keys in
 * lib/supabase/requiredSchema.json with the target environment and exits
 * non-zero before application traffic is served against an incompatible
 * database. This is the supported alternative to a silent client-side fallback
 * that pretends a missing column is present.
 *
 * Target resolution, in order:
 *   1. --db-url=<postgres url>
 *   2. --container=<disposable database container>
 *   3. SUPABASE_DB_URL
 *   4. the isolated local stack reported by `supabase status`
 *
 * A remote target is read-only: the preflight only ever runs SELECTs against
 * the catalogue.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CONTRACT_PATH = 'lib/supabase/requiredSchema.json';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited ${result.status}: ${(result.stderr || result.stdout || '').trim()}`,
    );
  }
  return result.stdout ?? '';
}

function localContainer() {
  const config = readFileSync('supabase/config.toml', 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
  if (!projectId) throw new Error('Could not resolve a local project_id from supabase/config.toml');
  return `supabase_db_${projectId}`;
}

const explicitUrl =
  process.argv.find((arg) => arg.startsWith('--db-url='))?.slice('--db-url='.length) ??
  process.env.SUPABASE_DB_URL ??
  null;
const explicitContainer =
  process.argv.find((arg) => arg.startsWith('--container='))?.slice('--container='.length) ?? null;

let query;
let targetLabel;
if (explicitUrl) {
  const parsed = new URL(explicitUrl);
  targetLabel = `${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
  query = (sql) => run('psql', [explicitUrl, '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
} else {
  const container = explicitContainer || localContainer();
  targetLabel = `local container ${container}`;
  query = (sql) =>
    run('docker', [
      'exec', container,
      'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', sql,
    ]);
}

const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
const problems = [];

const columnRows = query(`
  select c.relname || '.' || a.attname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
  where n.nspname = 'public' and c.relkind in ('r','p','v','m')
    and a.attnum > 0 and not a.attisdropped
`)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const presentColumns = new Set(columnRows);
const presentTables = new Set(columnRows.map((entry) => entry.split('.')[0]));

for (const relation of contract.relations) {
  if (!presentTables.has(relation.table)) {
    problems.push(`missing relation public.${relation.table} (${relation.requiredBy})`);
    continue;
  }
  for (const column of relation.columns) {
    if (!presentColumns.has(`${relation.table}.${column}`)) {
      problems.push(`missing column public.${relation.table}.${column} (${relation.requiredBy})`);
    }
  }
}

const foreignKeys = new Set(
  query(`
    select
      conrelid::regclass::text || '(' ||
      (select string_agg(a.attname, ',' order by k.ord)
         from unnest(conkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = conrelid and a.attnum = k.attnum)
      || ')->' || confrelid::regclass::text
    from pg_constraint
    where contype = 'f' and connamespace = 'public'::regnamespace
  `)
    .split('\n')
    .map((line) => line.trim().replace(/^public\./, '').replace('->public.', '->'))
    .filter(Boolean),
);

for (const fk of contract.foreignKeys) {
  const signature = `${fk.table}(${fk.columns.join(',')})->${fk.references}`;
  if (!foreignKeys.has(signature)) {
    problems.push(`missing foreign key ${signature} (${fk.requiredBy})`);
  }
}

/*
 * Grants are part of the contract: a table can exist with every column and
 * still be unreachable, which is how RUN-03 and RUN-06 both surfaced as 500s.
 */
const grantRows = new Set(
  query(`
    select table_name || '|' || grantee || '|' || privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
  `)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
);

for (const grant of contract.grants ?? []) {
  for (const privilege of grant.privileges) {
    const signature = `${grant.table}|${grant.role}|${privilege}`;
    if (!grantRows.has(signature)) {
      problems.push(`missing grant ${privilege} on public.${grant.table} to ${grant.role} (${grant.requiredBy})`);
    }
  }
}

const relationCount = contract.relations.length;
const columnCount = contract.relations.reduce((total, relation) => total + relation.columns.length, 0);

if (problems.length) {
  console.error(`FAIL schema preflight against ${targetLabel}`);
  for (const problem of problems) console.error(`  · ${problem}`);
  console.error(
    '\nThe application requires these objects before it may serve traffic. Apply the outstanding forward migrations and regenerate lib/supabase/types.ts.',
  );
  process.exit(1);
}

console.log(
  `PASS schema preflight against ${targetLabel} (${relationCount} relations, ${columnCount} columns, ${contract.foreignKeys.length} foreign keys, ${(contract.grants ?? []).length} grant sets).`,
);
