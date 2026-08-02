import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  ACTIVE_MIGRATIONS,
  EXPECTED_SCHEMA_HASH,
  assertActiveMigrationLayout,
} from './release-migration-manifest.mjs';

if (!process.argv.includes('--allow-destructive-local-reset')) {
  throw new Error(
    'Refusing to reset the existing local database. Run this rehearsal in an approved disposable environment or pass --allow-destructive-local-reset explicitly.',
  );
}

const BASELINE_VERSIONS = ACTIVE_MIGRATIONS.slice(0, 2).map((file) => file.slice(0, 14));
const FORWARD_MIGRATIONS = ACTIVE_MIGRATIONS.slice(2);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
  return result.stdout ?? '';
}

function runRaw(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(
  /^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m,
)?.[1];
if (!projectId) throw new Error('Could not resolve local Supabase project_id');
const dbContainer = `supabase_db_${projectId}`;

const migrations = readdirSync('supabase/migrations')
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();
assertActiveMigrationLayout(migrations);

const provenanceRows = JSON.parse(
  readFileSync(
    'docs/audits/unauth-mvp-plus/12-migration-provenance-register.json',
    'utf8',
  ),
);
const legacyMigrations = provenanceRows
  .filter((row) => row.in_prod === true)
  .map((row) => ({ version: row.version, name: row.name }));
assertEqual(legacyMigrations.length, 222, 'production legacy migration count');
for (const row of legacyMigrations) {
  if (!/^\d{4,14}$/.test(row.version) || !/^[a-z0-9_]+$/.test(row.name)) {
    throw new Error(`Unsafe migration provenance row: ${JSON.stringify(row)}`);
  }
}
const legacyVersions = legacyMigrations.map((row) => row.version);
const archiveDir = 'supabase/migrations_archive/pre_canonical_20260722';
const archiveFiles = readdirSync(archiveDir);
const historyRollbackWorkdir = mkdtempSync(
  join(tmpdir(), 'unauth-rollout-history-'),
);
const rollbackSupabaseDir = join(historyRollbackWorkdir, 'supabase');
const rollbackMigrationsDir = join(rollbackSupabaseDir, 'migrations');
mkdirSync(rollbackMigrationsDir, { recursive: true });
copyFileSync('supabase/config.toml', join(rollbackSupabaseDir, 'config.toml'));
for (const row of legacyMigrations) {
  const matches = archiveFiles.filter((file) => file.startsWith(`${row.version}_`));
  assertEqual(matches.length, 1, `archived migration file for ${row.version}`);
  symlinkSync(
    resolve(archiveDir, matches[0]),
    join(rollbackMigrationsDir, matches[0]),
  );
}

function sql(query) {
  return run('docker', [
    'exec',
    dbContainer,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-At',
    '-c',
    query,
  ]).trim();
}

function schemaHash() {
  const dump = run('docker', [
    'exec',
    dbContainer,
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '--schema-only',
    '--schema=public',
    '--no-owner',
    '--no-privileges',
    '--no-comments',
  ]);
  const normalized = dump
    .split('\n')
    .filter((line) => !/^\\(?:un)?restrict /.test(line))
    .join('\n');
  return createHash('sha256').update(normalized).digest('hex');
}

const expectedVersions = ACTIVE_MIGRATIONS.map((file) => file.slice(0, 14));
const historyBefore = sql(
  'select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations',
);
assertEqual(historyBefore, expectedVersions.join('\n'), 'applied migration history');
assertEqual(schemaHash(), EXPECTED_SCHEMA_HASH, 'pre-rehearsal schema checkpoint');

const monitor = sql(`
  select
    (select count(*) from pg_index where not indisvalid or not indisready)::text || '|' ||
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
      where t.tgname in ('trg_durable_audit','trg_case_investigations_durable_audit',
        'trg_case_investigation_dispatches_durable_audit',
        'trg_case_investigation_attachments_durable_audit')
        and c.relkind='r')::text || '|' ||
    (select count(*) from pg_policies where schemaname='public')::text
`);
assertEqual(monitor, '0|29|161', 'post-rollout monitoring invariants');

try {
  // Reconstruct the exact pre-rollout shape: the production-derived baseline
  // and supplement are present, while history still contains the 222 legacy
  // versions captured from production.
  run('supabase', [
    'db',
    'reset',
    '--local',
    '--version',
    BASELINE_VERSIONS.at(-1),
    '--no-seed',
  ]);
  assertEqual(
    sql('select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations'),
    BASELINE_VERSIONS.join('\n'),
    'baseline-only migration history',
  );

  const legacyValues = legacyMigrations
    .map(
      ({ version, name }) =>
        `('${version}', array[]::text[], '${name}')`,
    )
    .join(',');
  sql(`
    delete from supabase_migrations.schema_migrations;
    insert into supabase_migrations.schema_migrations (version, statements, name)
    values ${legacyValues};
  `);
  assertEqual(
    sql('select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations'),
    legacyVersions.join('\n'),
    'synthetic production legacy history',
  );

  const unsafePush = runRaw('supabase', [
    'db',
    'push',
    '--local',
    '--dry-run',
    '--yes',
  ]);
  if (unsafePush.status === 0) {
    throw new Error('Unreconciled legacy history unexpectedly allowed db push');
  }

  const reconcileForward = () => {
    run('supabase', [
      'migration',
      'repair',
      '--local',
      '--status',
      'reverted',
      '--yes',
      ...legacyVersions,
    ]);
    assertEqual(
      sql('select count(*) from supabase_migrations.schema_migrations'),
      '0',
      'legacy history removal',
    );
    run('supabase', [
      'migration',
      'repair',
      '--local',
      '--status',
      'applied',
      '--yes',
      ...BASELINE_VERSIONS,
    ]);
    assertEqual(
      sql('select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations'),
      BASELINE_VERSIONS.join('\n'),
      'canonical baseline history',
    );
  };

  reconcileForward();

  // Before any forward DDL, prove that the history-only operation can be
  // rolled back to the captured 222-version state with the supported CLI.
  run('supabase', [
    'migration',
    'repair',
    '--local',
    '--status',
    'reverted',
    '--yes',
    ...BASELINE_VERSIONS,
  ]);
  run('supabase', [
    'migration',
    'repair',
    '--workdir',
    historyRollbackWorkdir,
    '--local',
    '--status',
    'applied',
    '--yes',
    ...legacyVersions,
  ]);
  assertEqual(
    sql('select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations'),
    legacyVersions.join('\n'),
    'history-only rollback restoration',
  );

  reconcileForward();
  const dryRunResult = runRaw('supabase', [
    'db',
    'push',
    '--local',
    '--dry-run',
    '--yes',
  ]);
  if (dryRunResult.status !== 0) {
    if (dryRunResult.stdout) process.stderr.write(dryRunResult.stdout);
    if (dryRunResult.stderr) process.stderr.write(dryRunResult.stderr);
    throw new Error(`Canonical forward dry run failed with status ${dryRunResult.status}`);
  }
  const dryRun = `${dryRunResult.stdout ?? ''}\n${dryRunResult.stderr ?? ''}`;
  for (const migration of FORWARD_MIGRATIONS) {
    if (!dryRun.includes(migration.replace(/\.sql$/, ''))) {
      throw new Error(`Dry run omitted forward migration ${migration}`);
    }
  }
  run('supabase', ['db', 'push', '--local', '--yes']);

  const historyAfter = sql(
    'select string_agg(version, E\'\\n\' order by version) from supabase_migrations.schema_migrations',
  );
  assertEqual(historyAfter, historyBefore, 'post-rollout migration history');
  assertEqual(schemaHash(), EXPECTED_SCHEMA_HASH, 'post-rollout schema checkpoint');
  assertEqual(
    sql(`
      select
        (select count(*) from pg_index where not indisvalid or not indisready)::text || '|' ||
        (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
          where t.tgname in ('trg_durable_audit','trg_case_investigations_durable_audit',
            'trg_case_investigation_dispatches_durable_audit',
            'trg_case_investigation_attachments_durable_audit')
            and c.relkind='r')::text || '|' ||
        (select count(*) from pg_policies where schemaname='public')::text
    `),
    '0|29|161',
    'rehearsed post-rollout monitoring invariants',
  );
} catch (error) {
  try {
    run('supabase', ['db', 'reset', '--local', '--no-seed']);
  } catch (restoreError) {
    throw new AggregateError(
      [error, restoreError],
      'Rollout rehearsal failed and canonical local restore also failed',
    );
  }
  throw error;
} finally {
  rmSync(historyRollbackWorkdir, { recursive: true, force: true });
}

console.log(
  `Local production-history reconciliation, rollout, monitoring, and pre-DDL rollback rehearsal passed (${legacyVersions.length} legacy versions -> ${expectedVersions.length} canonical migrations; ${EXPECTED_SCHEMA_HASH}).`,
);
