import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ACTIVE_MIGRATIONS,
  EXPECTED_CANONICAL_COUNTS,
  EXPECTED_SCHEMA_HASH,
  assertActiveMigrationLayout,
} from './release-migration-manifest.mjs';

const allowDestructiveReset = process.argv.includes('--allow-destructive-local-reset');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return result.stdout ?? '';
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Could not resolve a safe local project_id from supabase/config.toml');
const dbContainer = `supabase_db_${projectId}`;

const migrations = readdirSync('supabase/migrations')
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();
assertActiveMigrationLayout(migrations);

if (!allowDestructiveReset) {
  throw new Error(
    'Refusing to reset the existing local database. Run this verifier in an approved disposable environment or pass --allow-destructive-local-reset explicitly.',
  );
}

run('supabase', ['db', 'reset', '--local'], { stdio: 'inherit' });

function sql(query) {
  return run('docker', [
    'exec', dbContainer,
    'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-c', query,
  ]).trim();
}

const counts = Object.fromEntries(sql(`
  select 'tables', count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  union all select 'views', count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('v','m')
  union all select 'sequences', count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='S'
  union all select 'enums', count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typtype='e'
  union all select 'columns', count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
    and a.attnum>0 and not a.attisdropped
  union all select 'not_null_columns', count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
    and a.attnum>0 and not a.attisdropped and a.attnotnull
  union all select 'constraints', count(*) from pg_constraint x join pg_namespace n on n.oid=x.connamespace
    where n.nspname='public'
  union all select 'indexes', count(*) from pg_index i join pg_class c on c.oid=i.indexrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all select 'functions', count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
  union all select 'triggers', count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
  union all select 'policies', count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
`).split('\n').map((line) => line.split('|')));

const expectedCounts = EXPECTED_CANONICAL_COUNTS;
assertEqual(JSON.stringify(counts), JSON.stringify(expectedCounts), 'canonical object manifest');

assertEqual(
  sql(`select string_agg(id || ':' || public::text || ':' || coalesce(file_size_limit::text, '-') || ':' || coalesce(array_to_string(allowed_mime_types, ','), '-'), ';' order by id) from storage.buckets where id in ('merchant-csv-uploads-2','evidence-packages','integration-documents','pack-confirmation-photos','investigation-evidence')`),
  'evidence-packages:false:104857600:application/pdf;integration-documents:false:-:-;investigation-evidence:false:10485760:application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,image/webp;merchant-csv-uploads-2:false:524288000:text/csv,application/csv,text/plain;pack-confirmation-photos:false:-:-',
  'storage bucket supplement',
);
assertEqual(
  sql(`select string_agg(policyname || ':' || cmd, ';' order by policyname) from pg_policies where schemaname='storage' and tablename='objects'`),
  'Authenticated users can delete own files:DELETE;Authenticated users can upload:INSERT;Authenticated users can view own files:SELECT',
  'repository-proven storage policies',
);
assertEqual(
  sql(`select puballtables::text || ':' || pubinsert::text || ':' || pubupdate::text || ':' || pubdelete::text || ':' || pubtruncate::text || ':' || (select count(*) from pg_publication_tables where pubname='supabase_realtime')::text from pg_publication where pubname='supabase_realtime'`),
  'false:true:true:true:true:0',
  'realtime publication',
);
assertEqual(
  sql(`select jobname || ':' || schedule || ':' || active::text from cron.job order by jobname`),
  'cleanup-rate-limits:*/5 * * * *:true\nfinalize-prevention-observations:17 2 * * *:true',
  'scheduled maintenance',
);
assertEqual(
  sql(`select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and t.tgname in ('trg_durable_audit','trg_case_investigations_durable_audit','trg_case_investigation_dispatches_durable_audit','trg_case_investigation_attachments_durable_audit') and c.relkind='r'`),
  '29',
  'durable trigger inventory',
);
assertEqual(sql(`select to_regclass('public.customer_notes') is null`), 't', 'phantom customer_notes exclusion');
assertEqual(sql(`select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where t.tgname='trg_durable_audit' and c.relkind in ('v','m')`), '0', 'view trigger exclusion');

const dump = run('docker', [
  'exec', dbContainer,
  'pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--schema=public',
  '--no-owner', '--no-privileges', '--no-comments',
]);
const normalizedDump = dump
  .split('\n')
  .filter((line) => !/^\\(?:un)?restrict /.test(line))
  .join('\n');
const schemaHash = createHash('sha256').update(normalizedDump).digest('hex');
assertEqual(schemaHash, EXPECTED_SCHEMA_HASH, 'normalized public schema hash');

const generatedTypes = run('supabase', ['gen', 'types', 'typescript', '--local']);
assertEqual(
  generatedTypes.trimEnd(),
  readFileSync('lib/supabase/types.ts', 'utf8').trimEnd(),
  'generated local database types',
);

console.log(`Canonical database replay passed (${schemaHash}; ${migrations.length} active migrations).`);
