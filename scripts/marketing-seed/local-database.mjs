import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function parseStatus(output) {
  return Object.fromEntries(
    output.split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, '')]),
  );
}

export function resolveLocalDatabase() {
  if (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
    throw new Error('Refusing to run while DATABASE_URL or SUPABASE_DB_URL is set.');
  }
  const config = readFileSync('supabase/config.toml', 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
  if (!projectId) throw new Error('Could not resolve the local Supabase project id.');
  const result = spawnSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (result.status !== 0) throw new Error('The repository-local Supabase stack is not running.');
  const status = parseStatus(result.stdout);
  const apiUrl = status.API_URL;
  const host = apiUrl ? new URL(apiUrl).hostname : '';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Refusing non-local Supabase host: ${host || 'unknown'}.`);
  }
  const container = `supabase_db_${projectId}`;
  const probe = spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', 'select 1'], {
    encoding: 'utf8',
    shell: false,
  });
  if (probe.status !== 0 || probe.stdout.trim() !== '1') {
    throw new Error(`Local database container ${container} is unavailable.`);
  }
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  if (!apiUrl || !serviceRoleKey || !anonKey) throw new Error('Local Supabase did not report API credentials.');
  return { apiUrl, anonKey, serviceRoleKey, container };
}

export function runSql(container, statement) {
  const result = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    { input: statement, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: false },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Database command failed.').trim());
  }
  return (result.stdout ?? '').trim();
}

export function quoteSql(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `array[${value.map((entry) => quoteSql(entry)).join(',')}]::text[]`;
  if (typeof value === 'object') return `${quoteSql(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

const JSON_ARRAY_COLUMNS = new Set([
  'store_connections.scopes',
  'helpdesk_connections.scopes',
  'source_customers.tags',
  'source_orders.tags',
  'source_tickets.tags',
  'source_tickets.linked_order_external_ids',
  'merchant_rules.conditions',
  'merchant_rule_versions.conditions',
  'workflow_definitions.conditions',
  'workflow_definitions.outputs',
  'evidence_packages.signal_snapshot',
  'evidence_packages.ce3_qualifying_signals',
  'evidence_packages.ce3_prior_transactions',
  'recovery_cases.excluded_costs',
  'identity_members.matched_via',
]);

const UUID_ARRAY_COLUMNS = new Set([
  'case_recommendation_snapshots.supporting_evidence_ids',
  'case_recommendation_snapshots.conflicting_evidence_ids',
  'loss_cases.financial_entry_ids',
]);

function quoteColumn(table, column, value) {
  if (!Array.isArray(value)) return quoteSql(value);
  const key = `${table}.${column}`;
  if (JSON_ARRAY_COLUMNS.has(key)) return `${quoteSql(JSON.stringify(value))}::jsonb`;
  const cast = UUID_ARRAY_COLUMNS.has(key) ? 'uuid[]' : 'text[]';
  return `array[${value.map((entry) => quoteSql(entry)).join(',')}]::${cast}`;
}

export function insertSql(table, rows) {
  if (!rows.length) return '';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const values = rows.map((row) =>
    `(${columns.map((column) => column in row ? quoteColumn(table, column, row[column]) : 'default').join(',')})`,
  ).join(',\n');
  return `insert into public.${table} (${columns.join(',')}) values\n${values};`;
}
