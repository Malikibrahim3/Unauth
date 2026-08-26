import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.argv.includes('--allow-destructive-local-restore')) {
  throw new Error(
    'Refusing the scratch restore. Run only against the approved disposable local Supabase stack and pass --allow-destructive-local-restore.',
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
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

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Could not resolve a safe local project_id from supabase/config.toml');

const dbContainer = `supabase_db_${projectId}`;
const inspected = run('docker', [
  'inspect',
  '--format',
  '{{.Name}}|{{.State.Running}}|{{index .Config.Labels "com.supabase.cli.project"}}',
  dbContainer,
]).trim();
if (inspected !== `/${dbContainer}|true|${projectId}`) {
  throw new Error(`Refusing unverified database container: ${inspected || 'not found'}`);
}

const suffix = `${Date.now()}_${process.pid}`;
const restoreDatabase = `mr6_restore_${suffix}`;
const containerDump = `/tmp/${restoreDatabase}.dump`;
const containerList = `/tmp/${restoreDatabase}.list`;
const hostTemp = mkdtempSync(join(tmpdir(), 'unauth-mr6-restore-'));
const hostList = join(hostTemp, 'restore.list');
let databaseCreated = false;
let containerDumpCreated = false;
let containerListCreated = false;

function dockerExec(args, options = {}) {
  return run('docker', ['exec', dbContainer, ...args], options);
}

function sql(database, query) {
  return dockerExec([
    'psql', '-U', 'postgres', '-d', database, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query,
  ]).trim();
}

function fingerprint(database) {
  return JSON.parse(sql(database, `
    select json_build_object(
      'migration_count', (select count(*) from supabase_migrations.schema_migrations),
      'migration_max', (select max(version) from supabase_migrations.schema_migrations),
      'public_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
      'public_views', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('v', 'm')),
      'public_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
      'public_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
      'merchants', (select count(*) from public.merchants),
      'merchant_users', (select count(*) from public.merchant_users),
      'source_orders', (select count(*) from public.source_orders),
      'cases', (select count(*) from public.support_payout_cases),
      'recoveries', (select count(*) from public.recovery_cases),
      'financial_entries', (select count(*) from public.case_financial_entries),
      'notifications', (select count(*) from public.notifications),
      'audit_events', (select count(*) from public.access_audit_log),
      'storage_buckets', (select count(*) from storage.buckets),
      'storage_objects', (select count(*) from storage.objects),
      'auth_users', (select count(*) from auth.users)
    )::text
  `));
}

function cleanup() {
  const failures = [];
  if (databaseCreated) {
    try {
      dockerExec(['dropdb', '-U', 'postgres', '--if-exists', '--force', restoreDatabase]);
      databaseCreated = false;
    } catch (error) {
      failures.push(error.message);
    }
  }
  for (const [created, path] of [[containerListCreated, containerList], [containerDumpCreated, containerDump]]) {
    if (!created) continue;
    try {
      dockerExec(['unlink', path]);
    } catch (error) {
      failures.push(error.message);
    }
  }
  rmSync(hostTemp, { recursive: true, force: true });
  if (failures.length) throw new Error(`Scratch restore cleanup failed: ${failures.join('; ')}`);
}

try {
  const sourceFingerprint = fingerprint('postgres');
  dockerExec([
    'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc', '--no-owner', '--no-privileges',
    `--file=${containerDump}`,
  ]);
  containerDumpCreated = true;

  const archiveList = dockerExec(['pg_restore', '--list', containerDump]);
  const excludedClusterEntries = archiveList.split(/\r?\n/).filter((line) => (
    /EXTENSION(?: pg_cron)? .*pg_cron|COMMENT - EXTENSION pg_cron/.test(line)
    || line.includes('grant_pg_cron_access')
    || /TABLE DATA cron /.test(line)
    || /SEQUENCE SET cron /.test(line)
    || /EVENT TRIGGER - issue_pg_cron_access/.test(line)
  ));
  const restoreList = archiveList.split(/\r?\n/).filter((line) => !excludedClusterEntries.includes(line)).join('\n');
  writeFileSync(hostList, restoreList);
  run('docker', ['cp', hostList, `${dbContainer}:${containerList}`]);
  containerListCreated = true;

  dockerExec(['createdb', '-U', 'postgres', '--template=template0', restoreDatabase]);
  databaseCreated = true;
  run('docker', [
    'exec', '-e', 'PGPASSWORD=postgres', dbContainer,
    'pg_restore', '-U', 'supabase_admin', '-d', restoreDatabase, '--no-owner', '--no-privileges',
    '--exit-on-error', `--use-list=${containerList}`, containerDump,
  ]);

  const restoredFingerprint = fingerprint(restoreDatabase);
  if (JSON.stringify(restoredFingerprint) !== JSON.stringify(sourceFingerprint)) {
    throw new Error(
      `Restored application fingerprint differs from source: ${JSON.stringify({ sourceFingerprint, restoredFingerprint })}`,
    );
  }

  const archiveChecksum = dockerExec(['sha256sum', containerDump]).trim().split(/\s+/)[0];
  const archiveBytes = Number(dockerExec(['stat', '-c', '%s', containerDump]).trim());
  console.log(JSON.stringify({
    status: 'pass',
    scope: 'logical application database including public, auth, storage, and migration state',
    sourceDatabase: 'approved disposable local Supabase postgres',
    restoredToIsolatedScratchDatabase: true,
    fingerprint: restoredFingerprint,
    archiveSha256: archiveChecksum,
    archiveBytes,
    clusterBoundOmissions: [
      'pg_cron extension installation',
      'pg_cron job and run-history state',
      'pg_cron extension grant event trigger',
    ],
    cleanup: 'scratch database and temporary archive removed',
    checkedAt: new Date().toISOString(),
  }));
} finally {
  cleanup();
}
