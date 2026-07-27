/**
 * Phase 1 QA fixture seeder (deliverable 9).
 *
 * Guarded, deterministic and idempotent. It refuses any target that is not a
 * demonstrably isolated local database, writes only inside the `f1……` id
 * namespace the fixture owns, and upserts rather than appends so a second run
 * cannot grow the dataset.
 *
 * Usage:
 *   npm run seed:phase1-qa
 *   npm run seed:phase1-qa -- --as-of=2026-07-26T12:00:00.000Z
 *   npm run seed:phase1-qa -- --reset
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildFixture, fingerprint, DEFAULT_AS_OF, MERCHANT_ID, OTHER_MERCHANT_ID, OPERATOR_USER_ID } from './phase1-qa/fixture.mjs';

const asOf = process.argv.find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length) ?? DEFAULT_AS_OF;
const reset = process.argv.includes('--reset');

/* ---------------------------------------------------------------- guards -- */

/**
 * Refuses production, shared and unidentified targets. The only accepted target
 * is the repository's own local Supabase container, resolved from
 * supabase/config.toml rather than from ambient environment variables, because
 * `.env.local` in this repository points at a hosted project.
 */
function resolveLocalContainer() {
  const config = readFileSync('supabase/config.toml', 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
  if (!projectId) throw new Error('Could not resolve a local project_id from supabase/config.toml');

  const status = spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8', shell: false });
  if (status.status !== 0) {
    throw new Error('Local Supabase is not running. Start the isolated stack with `supabase start`.');
  }
  const apiUrl = status.stdout.match(/^API_URL="?([^"\n]+)"?$/m)?.[1];
  if (!apiUrl) throw new Error('Local Supabase status did not report an API_URL');
  const host = new URL(apiUrl).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Refusing non-local Supabase host ${host}`);
  }

  const container = `supabase_db_${projectId}`;
  const probe = spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-c', 'select 1'], {
    encoding: 'utf8',
    shell: false,
  });
  if (probe.status !== 0) {
    throw new Error(`Local database container ${container} is not reachable`);
  }
  return container;
}

if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
  console.error(
    'FAIL refusing to run: SUPABASE_DB_URL/DATABASE_URL is set. The Phase 1 QA fixture only ever targets the repository-local Supabase container.',
  );
  process.exit(1);
}

let container;
try {
  container = resolveLocalContainer();
} catch (error) {
  console.error(`FAIL isolated local target: ${error.message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- sql -- */

function sql(statement) {
  const result = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    { input: statement, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: false },
  );
  if (result.status !== 0) {
    throw new Error(`${(result.stderr || result.stdout || '').trim()}\n--- statement ---\n${statement.slice(0, 2000)}`);
  }
  return (result.stdout ?? '').trim();
}

const quote = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `array[${value.map((entry) => quote(entry)).join(',')}]::text[]`;
  if (typeof value === 'object') return `${quote(JSON.stringify(value))}::jsonb`;
  return `'${String(value).replaceAll("'", "''")}'`;
};

function upsert(table, rows, conflictColumn = 'id') {
  if (!rows.length) return 0;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  /*
   * A column the row does not mention gets `default`, not `null`: several
   * production columns are NOT NULL with a default, and passing an explicit
   * null would defeat the schema rather than exercise it. An explicit null in
   * the fixture is deliberate (missing currency, missing source) and is kept.
   */
  const values = rows
    .map((row) => `(${columns.map((column) => (column in row ? quote(row[column]) : 'default')).join(',')})`)
    .join(',\n    ');
  const updates = columns
    .filter((column) => column !== conflictColumn)
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  sql(`
    insert into public.${table} (${columns.join(',')})
    values
    ${values}
    on conflict (${conflictColumn}) do update set ${updates};
  `);
  return rows.length;
}


/**
 * The fixture operator is a real auth user because `work_saved_views` requires
 * an owner and the local e2e auth route mints a genuine session for it.
 * Created through the GoTrue admin API rather than a raw `auth.users` insert:
 * hand-written rows omit columns GoTrue requires and fail at sign-in time.
 */
async function ensureOperatorUser() {
  const status = spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8', shell: false });
  const values = Object.fromEntries(
    status.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/"$/, '')]),
  );
  const apiUrl = values.API_URL;
  const serviceRole = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
  };

  const existing = await fetch(`${apiUrl}/auth/v1/admin/users/${OPERATOR_USER_ID}`, { headers });
  if (existing.ok) return;

  const created = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: OPERATOR_USER_ID,
      email: 'qa.operator@qa.invalid',
      email_confirm: true,
      user_metadata: { full_name: 'QA Operator' },
    }),
  });
  if (!created.ok) {
    throw new Error(`Could not create the fixture operator: ${created.status} ${await created.text()}`);
  }
}

/* ------------------------------------------------------------------ seed -- */

const fixture = buildFixture(asOf);
const logicalFingerprint = fingerprint(fixture);
const fingerprintHash = createHash('sha256').update(logicalFingerprint).digest('hex');

/**
 * Cleanup is exact rather than heuristic: every fixture row lives inside the
 * `f1……` id namespace, and the two fixture merchants cascade. Nothing outside
 * that namespace is ever touched, which is what makes it safe to re-run.
 */
function cleanup() {
  sql(`
    delete from public.merchants
    where id in (${quote(MERCHANT_ID)}, ${quote(OTHER_MERCHANT_ID)});
    delete from auth.users where id = ${quote(OPERATOR_USER_ID)};
  `);
}

const unrelatedBefore = sql(
  `select count(*) from public.merchants where id not in (${quote(MERCHANT_ID)}, ${quote(OTHER_MERCHANT_ID)})`,
);

/*
 * Append-only guards (`domain_events`) and durable-audit triggers reject the
 * delete/reseed of history rows. They are production behaviour and stay
 * enabled everywhere else; the fixture suspends them only for its own write
 * window and always restores them in the finally block.
 */
const TRIGGER_TABLES = [
  'merchants',
  'merchant_users',
  'domain_events',
  'support_payout_cases',
  'case_clarification_requests',
  'case_claimed_items',
  'source_orders',
  'source_order_lines',
  'source_customers',
  'evidence_packages',
  'work_saved_views',
  'partners',
];

function setTriggers(enabled) {
  for (const table of TRIGGER_TABLES) {
    sql(`alter table public.${table} ${enabled ? 'enable' : 'disable'} trigger user;`);
  }
}

let seeded = {};
try {
  setTriggers(false);
  if (reset) cleanup();

  await ensureOperatorUser();

  seeded = {
    merchants: upsert('merchants', fixture.merchants),
    merchant_users: upsert('merchant_users', fixture.memberships),
    partners: upsert('partners', fixture.partners),
    source_customers: upsert('source_customers', fixture.customers),
    source_orders: upsert('source_orders', fixture.orders),
    source_order_lines: upsert('source_order_lines', fixture.orderLines),
    domain_events: upsert('domain_events', fixture.domainEvents),
    support_payout_cases: upsert(
      'support_payout_cases',
      fixture.cases.map(({ key, ...row }) => row),
    ),
    case_claimed_items: upsert('case_claimed_items', fixture.claimedItems),
    case_clarification_requests: upsert('case_clarification_requests', fixture.clarifications),
    work_saved_views: upsert('work_saved_views', fixture.savedViews),
    evidence_packages: upsert('evidence_packages', fixture.evidencePackages),
  };
} finally {
  setTriggers(true);
}

const unrelatedAfter = sql(
  `select count(*) from public.merchants where id not in (${quote(MERCHANT_ID)}, ${quote(OTHER_MERCHANT_ID)})`,
);
if (unrelatedBefore !== unrelatedAfter) {
  console.error(`FAIL the seed changed unrelated merchant rows (${unrelatedBefore} -> ${unrelatedAfter})`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'seeded',
      target: container,
      asOf,
      merchantId: MERCHANT_ID,
      fixtureVersion: fixture.version,
      fingerprint: fingerprintHash,
      rows: seeded,
      unrelatedMerchantsUnchanged: unrelatedBefore === unrelatedAfter,
    },
    null,
    2,
  ),
);
