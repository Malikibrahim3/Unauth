/**
 * DEV-ONLY fixture tool for exercising Integration Health connector states
 * (lib/connections/effectiveStatus.ts, lib/connections/freshness.ts) in the
 * running app / browser, without ad hoc scripts that mutate a real
 * merchant's data by guessing at a display name.
 *
 * Safety properties (all enforced in code, not just documented):
 *  - Refuses to run when NODE_ENV or VERCEL_ENV is "production".
 *  - Requires --merchant, --provider, --state explicitly — no defaults.
 *  - --merchant must be in ALLOWED_MERCHANT_IDS below. Any other id is
 *    rejected. Add new ids to that list deliberately, one at a time.
 *  - Every row it's about to touch is snapshotted (by primary key, never a
 *    broad WHERE) to a local JSON file before mutating.
 *  - `restore` reads that snapshot, writes the row back, then re-reads and
 *    diffs the restored row against the snapshot — it throws loudly on any
 *    mismatch rather than silently leaving the row wrong.
 *  - Never logs credentials_encrypted / access_token_encrypted / webhook
 *    secret columns, in either direction.
 *  - Fails closed: an unsupported provider/state, or a missing expected
 *    row when restoring, is an error, never a silent no-op.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json --transpile-only \
 *     -r dotenv/config -r tsconfig-paths/register \
 *     scripts/dev/integrationHealthFixture.ts apply \
 *       --merchant <id> --provider <shopify|gorgias|shipbob|ups|fedex> --state <state>
 *
 *   npx ts-node --project tsconfig.scripts.json --transpile-only \
 *     -r dotenv/config -r tsconfig-paths/register \
 *     scripts/dev/integrationHealthFixture.ts restore \
 *       --merchant <id> --provider <provider>
 *
 * States: healthy | stale | sync_pending | no_data | sync_failed |
 *         disconnected | verification_unavailable | connection_verified
 * (connection_verified/verification_unavailable and "healthy" for an
 * on-demand provider only make practical sense for ups/fedex; the others
 * apply to shopify/gorgias/shipbob. See the state table below.)
 *
 * `apply` intentionally leaves the row in place afterward so it can be
 * viewed in the browser — it does not auto-restore. Always run `restore`
 * once you're done to put the row back exactly as it was.
 *
 * Testability: everything above the "DB EXECUTION" section is pure —
 * argument parsing, validation, mutation-plan construction (what row(s)
 * would be touched, with what filter and fields) and restore-plan
 * construction are plain functions with no I/O, so their safety behaviour
 * (scoping, field selection, secret handling) can be unit-tested without a
 * database. Only `applyPlan`/`restorePlan` below actually touch Supabase —
 * see tests/unit/integrationHealthFixture.test.ts.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { encryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { encryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';

export function isProductionEnvironment(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

// Known safe test/demo merchant ids only. Add new ids deliberately.
export const ALLOWED_MERCHANT_IDS = new Set([
  '2cc9c41e-3579-482b-9364-5429be966288', // Elara & Co Apparel — demo@unauth.app sandbox, confirmed safe for this purpose 2026-07-16
]);

export const SUPPORTED_PROVIDERS = ['shopify', 'gorgias', 'shipbob', 'ups', 'fedex'] as const;
export type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export const SUPPORTED_STATES = [
  'healthy',
  'connection_verified',
  'stale',
  'sync_pending',
  'no_data',
  'sync_failed',
  'disconnected',
  'verification_unavailable',
] as const;
export type FixtureState = (typeof SUPPORTED_STATES)[number];

const SECRET_COLUMNS = new Set([
  'credentials_encrypted',
  'access_token_encrypted',
  'webhook_secret',
  'webhook_secret_hash',
]);

export function redact(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return row;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    copy[key] = SECRET_COLUMNS.has(key) ? '[redacted]' : value;
  }
  return copy;
}

// `updated_at` is stamped by a DB trigger on every write, independent of
// what a client sends — restoring a row can never pin it back to its exact
// prior value, so it's the only column excluded from the read-back equality
// check below. Every other column IS compared, so this can't mask a real
// restore failure.
const SERVER_MANAGED_COLUMNS = new Set(['updated_at']);

export function forComparison(row: Record<string, unknown> | null): Record<string, unknown> | null {
  const redacted = redact(row);
  if (!redacted) return redacted;
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(redacted)) {
    if (!SERVER_MANAGED_COLUMNS.has(key)) rest[key] = value;
  }
  return rest;
}

/** Two snapshots are equivalent for restore purposes iff every field except
 * the server-managed ones (above) matches exactly. */
export function rowsMatchForRestore(expected: Record<string, unknown> | null, actual: Record<string, unknown> | null): boolean {
  return JSON.stringify(forComparison(expected)) === JSON.stringify(forComparison(actual));
}

export function parseArgs(argv: string[]) {
  const command = argv[0];
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    command,
    merchant: get('--merchant'),
    provider: get('--provider') as Provider | undefined,
    state: get('--state') as FixtureState | undefined,
  };
}

export function assertAllowedMerchant(merchantId: string | undefined): asserts merchantId is string {
  if (!merchantId) throw new Error('--merchant is required.');
  if (!ALLOWED_MERCHANT_IDS.has(merchantId)) {
    throw new Error(
      `Merchant id "${merchantId}" is not in ALLOWED_MERCHANT_IDS. ` +
        'Add it deliberately in scripts/dev/integrationHealthFixture.ts if you have confirmed it is a safe test/demo account.',
    );
  }
}

export function assertSupportedProvider(provider: Provider | undefined): asserts provider is Provider {
  if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`--provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
}

export function assertSupportedState(state: FixtureState | undefined): asserts state is FixtureState {
  if (!state || !SUPPORTED_STATES.includes(state)) {
    throw new Error(`--state must be one of: ${SUPPORTED_STATES.join(', ')}`);
  }
}

export function snapshotPath(merchantId: string, provider: Provider): string {
  return path.join(tmpdir(), `integration-health-fixture-${merchantId}-${provider}.json`);
}

export type Snapshot = {
  merchantId: string;
  provider: Provider;
  merchantIntegration: { existed: boolean; row: Record<string, unknown> | null };
  legacyConnection: { table: string | null; existed: boolean; row: Record<string, unknown> | null };
};

export function legacyTableFor(provider: Provider): { table: string; matchColumn: string; matchValue: string } | null {
  if (provider === 'shopify') return { table: 'store_connections', matchColumn: 'platform', matchValue: 'shopify' };
  if (provider === 'gorgias') return { table: 'helpdesk_connections', matchColumn: 'provider', matchValue: 'gorgias' };
  return null;
}

const HOUR = 60 * 60 * 1000;

export function stateFields(state: FixtureState, now: Date) {
  const nowIso = now.toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * HOUR).toISOString();
  const base = {
    status: 'connected' as string,
    last_sync_started_at: null as string | null,
    last_sync_completed_at: null as string | null,
    last_successful_sync_at: null as string | null,
    webhook_last_received_at: null as string | null,
    imported_record_count: 0,
    last_error_code: null as string | null,
    last_error_message: null as string | null,
    last_error: null as string | null,
  };
  switch (state) {
    case 'healthy':
      return { ...base, last_sync_started_at: twoDaysAgo, last_sync_completed_at: twoDaysAgo, last_successful_sync_at: twoDaysAgo, webhook_last_received_at: nowIso, imported_record_count: 42 };
    case 'connection_verified':
      return { ...base }; // meaningful only combined with a valid on-demand credential; DB state alone is the same as "connected, nothing else known"
    case 'stale':
      return { ...base, last_sync_started_at: twoDaysAgo, last_sync_completed_at: twoDaysAgo, last_successful_sync_at: twoDaysAgo, webhook_last_received_at: twoDaysAgo, imported_record_count: 42 };
    case 'sync_pending':
      return { ...base };
    case 'no_data':
      return { ...base, last_sync_started_at: twoDaysAgo, last_sync_completed_at: twoDaysAgo, webhook_last_received_at: null, imported_record_count: 0 };
    case 'sync_failed':
      return { ...base, last_sync_started_at: twoDaysAgo, last_error_code: 'fixture_ingest_failed', last_error_message: 'fixture_ingest_failed', last_error: 'fixture_ingest_failed' };
    case 'disconnected':
      return { ...base, status: 'revoked', last_sync_started_at: twoDaysAgo, last_sync_completed_at: twoDaysAgo, last_successful_sync_at: twoDaysAgo, imported_record_count: 42 };
    case 'verification_unavailable':
      return { ...base, last_sync_started_at: twoDaysAgo, last_sync_completed_at: twoDaysAgo, last_successful_sync_at: twoDaysAgo, imported_record_count: 42 };
    default:
      return base;
  }
}

/** For verification_unavailable on shopify/gorgias: a validly-encrypted
 * credential pointed at an RFC 2606 reserved ".invalid" hostname — the
 * live probe's decrypt step succeeds, then its fetch fails fast on DNS
 * resolution (no real third-party host is ever contacted), producing a
 * genuine `inconclusive` result rather than a fabricated one. Only this one
 * state ever touches credential columns — every other state returns fields
 * that exclude them entirely. */
export function legacyRowFieldsForState(provider: Provider, state: FixtureState, now: Date): Record<string, unknown> | null {
  if (provider === 'shopify') {
    if (state === 'verification_unavailable') {
      return {
        status: 'active',
        store_key: 'fixture-unreachable-host.invalid',
        credentials_encrypted: encryptBigCommerceOAuthCredentials({ access_token: 'fixture-token' }),
        uninstalled_at: null,
      };
    }
    // decrypt-failure ('error' badge) is already exercised by this
    // account's pre-existing broken store_connections row from earlier
    // testing — apply() does not touch this table for other states.
    return null;
  }
  if (provider === 'gorgias') {
    if (state === 'verification_unavailable') {
      return {
        status: 'active',
        provider_base_url: 'https://fixture-unreachable-host.invalid',
        access_token_encrypted: encryptGorgiasApiCredentials({ email: 'fixture@example.com', api_key: 'fixture-key' }),
        last_sync_at: null,
      };
    }
    // Gorgias's real freshness signal is helpdesk_connections.last_sync_at
    // (lib/connections/freshness.ts::resolveGorgiasFreshness) — it must be
    // set/cleared per state here too, or a stale leftover value from a prior
    // run silently overrides whatever this state is trying to demonstrate
    // (exactly the reproducibility bug this tool exists to prevent).
    const nowIso = now.toISOString();
    const twoDaysAgo = new Date(now.getTime() - 48 * HOUR).toISOString();
    if (state === 'healthy') return { last_sync_at: nowIso };
    if (state === 'stale') return { last_sync_at: twoDaysAgo };
    return { last_sync_at: null };
  }
  return null;
}

/** A single planned table mutation — table + filter (always includes
 * merchant_id, plus id for update/delete) + fields. Pure data; no I/O. */
export type PlannedMutation =
  | { op: 'update'; table: string; filter: { merchant_id: string; id: string }; fields: Record<string, unknown> }
  | { op: 'insert'; table: string; fields: Record<string, unknown> }
  | { op: 'delete'; table: string; filter: Record<string, string> };

export type ApplyPlan = {
  merchantIntegration: PlannedMutation;
  legacy: PlannedMutation | null;
};

/**
 * Builds the exact set of mutations `apply` would perform — pure, no DB
 * access. Every mutation is scoped by merchant_id (and by id when updating
 * an existing row), never a broad/unscoped WHERE.
 */
export function buildApplyPlan(input: {
  merchant: string;
  provider: Provider;
  state: FixtureState;
  now: Date;
  existingMerchantIntegration: (Record<string, unknown> & { id: string }) | null;
  existingLegacyRow: (Record<string, unknown> & { id: string }) | null;
}): ApplyPlan {
  const fields = stateFields(input.state, input.now);
  const merchantIntegration: PlannedMutation = input.existingMerchantIntegration
    ? {
        op: 'update',
        table: 'merchant_integrations',
        filter: { merchant_id: input.merchant, id: input.existingMerchantIntegration.id },
        fields,
      }
    : {
        op: 'insert',
        table: 'merchant_integrations',
        fields: {
          merchant_id: input.merchant,
          provider_id: input.provider,
          category: input.provider === 'gorgias' ? 'helpdesk' : input.provider === 'shipbob' ? 'warehouse_3pl' : input.provider === 'shopify' ? 'commerce' : 'carrier',
          auth_mode: input.provider === 'shopify' || input.provider === 'ups' || input.provider === 'fedex' ? 'oauth' : 'api_key',
          display_name: `Fixture ${input.provider}`,
          provider_account_id: `fixture-${input.provider}`,
          provider_account_name: `Fixture ${input.provider}`,
          ...fields,
        },
      };

  const legacyFields = legacyRowFieldsForState(input.provider, input.state, input.now);
  let legacy: PlannedMutation | null = null;
  if (legacyFields) {
    const legacyTable = legacyTableFor(input.provider)!;
    legacy = input.existingLegacyRow
      ? { op: 'update', table: legacyTable.table, filter: { merchant_id: input.merchant, id: input.existingLegacyRow.id }, fields: legacyFields }
      : { op: 'insert', table: legacyTable.table, fields: { merchant_id: input.merchant, [legacyTable.matchColumn]: legacyTable.matchValue, ...legacyFields } };
  }

  return { merchantIntegration, legacy };
}

export type RestorePlan = {
  merchantIntegration: PlannedMutation;
  legacy: PlannedMutation | null;
};

/** Builds the exact restore mutations from a snapshot — pure, no DB access.
 * Every mutation is scoped by merchant_id (and id for update, or the
 * provider's natural key for the cleanup delete — never a broad WHERE). */
export function buildRestorePlan(snapshot: Snapshot): RestorePlan {
  const merchantIntegration: PlannedMutation = snapshot.merchantIntegration.existed && snapshot.merchantIntegration.row
    ? { op: 'update', table: 'merchant_integrations', filter: { merchant_id: snapshot.merchantId, id: snapshot.merchantIntegration.row.id as string }, fields: snapshot.merchantIntegration.row }
    : { op: 'delete', table: 'merchant_integrations', filter: { merchant_id: snapshot.merchantId, provider_id: snapshot.provider } };

  let legacy: PlannedMutation | null = null;
  if (snapshot.legacyConnection.table) {
    if (snapshot.legacyConnection.existed && snapshot.legacyConnection.row) {
      legacy = { op: 'update', table: snapshot.legacyConnection.table, filter: { merchant_id: snapshot.merchantId, id: snapshot.legacyConnection.row.id as string }, fields: snapshot.legacyConnection.row };
    } else {
      const legacyTable = legacyTableFor(snapshot.provider)!;
      legacy = { op: 'delete', table: snapshot.legacyConnection.table, filter: { merchant_id: snapshot.merchantId, [legacyTable.matchColumn]: legacyTable.matchValue } };
    }
  }
  return { merchantIntegration, legacy };
}

// ─────────────────────────── DB EXECUTION ───────────────────────────
// Everything below this line performs real I/O (Supabase, filesystem) and
// is exercised by live/manual verification, not unit tests.

type MutationResult = { error: { message: string } | null };
type SelectResult = { data: unknown[] | null };
// Mirrors the real Supabase query builder: .eq() is chainable to any depth
// and the builder itself is awaitable (thenable) at any point.
type QueryBuilder<T> = PromiseLike<T> & { eq: (c: string, v: unknown) => QueryBuilder<T> };
type SelectBuilder = QueryBuilder<SelectResult> & { limit: (n: number) => PromiseLike<SelectResult> };

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (cols: string) => SelectBuilder;
    update: (fields: Record<string, unknown>) => QueryBuilder<MutationResult>;
    insert: (fields: Record<string, unknown>) => PromiseLike<MutationResult>;
    delete: () => QueryBuilder<MutationResult>;
  };
};

async function fetchRow(client: SupabaseLikeClient, table: string, merchantId: string, matchColumn: string, matchValue: string) {
  const { data } = await client.from(table).select('*').eq('merchant_id', merchantId).eq(matchColumn, matchValue).limit(1);
  return (data?.[0] as (Record<string, unknown> & { id: string }) | undefined) ?? null;
}

async function executeMutation(client: SupabaseLikeClient, mutation: PlannedMutation): Promise<void> {
  if (mutation.op === 'insert') {
    const { error } = await client.from(mutation.table).insert(mutation.fields);
    if (error) throw new Error(`${mutation.table} insert failed: ${error.message}`);
    return;
  }
  const filterEntries = Object.entries(mutation.filter);
  if (filterEntries.length < 2) throw new Error(`refusing an unscoped ${mutation.op} on ${mutation.table} — filter must include merchant_id and a second predicate`);
  let query: QueryBuilder<MutationResult> = mutation.op === 'update'
    ? client.from(mutation.table).update(mutation.fields)
    : client.from(mutation.table).delete();
  for (const [col, val] of filterEntries) query = query.eq(col, val);
  const { error } = await query;
  if (error) throw new Error(`${mutation.table} ${mutation.op} failed: ${error.message}`);
}

async function applyPlan() {
  if (isProductionEnvironment(process.env)) {
    console.error('integrationHealthFixture: refusing to run with NODE_ENV/VERCEL_ENV=production.');
    process.exit(1);
  }
  const { merchant, provider, state } = parseArgs(process.argv.slice(2));
  assertAllowedMerchant(merchant);
  assertSupportedProvider(provider);
  assertSupportedState(state);

  const { createServiceClient } = await import('@/lib/supabase/server');
  const client = createServiceClient() as SupabaseLikeClient;
  const existingMerchantIntegration = await fetchRow(client, 'merchant_integrations', merchant, 'provider_id', provider);
  const legacyTable = legacyTableFor(provider);
  const existingLegacyRow = legacyTable ? await fetchRow(client, legacyTable.table, merchant, legacyTable.matchColumn, legacyTable.matchValue) : null;

  const snapshot: Snapshot = {
    merchantId: merchant,
    provider,
    merchantIntegration: { existed: existingMerchantIntegration !== null, row: existingMerchantIntegration },
    legacyConnection: { table: legacyTable?.table ?? null, existed: existingLegacyRow !== null, row: existingLegacyRow },
  };
  writeFileSync(snapshotPath(merchant, provider), JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Snapshot saved: ${snapshotPath(merchant, provider)}`);
  console.log('Pre-existing merchant_integrations row:', redact(existingMerchantIntegration));
  console.log('Pre-existing legacy connection row:', redact(existingLegacyRow));

  const plan = buildApplyPlan({ merchant, provider, state, now: new Date(), existingMerchantIntegration, existingLegacyRow });
  await executeMutation(client, plan.merchantIntegration);
  if (plan.legacy) await executeMutation(client, plan.legacy);

  console.log(`Applied state "${state}" for ${provider} on merchant ${merchant}. Run "restore" when done viewing.`);
}

async function restorePlan() {
  if (isProductionEnvironment(process.env)) {
    console.error('integrationHealthFixture: refusing to run with NODE_ENV/VERCEL_ENV=production.');
    process.exit(1);
  }
  const { merchant, provider } = parseArgs(process.argv.slice(2));
  assertAllowedMerchant(merchant);
  assertSupportedProvider(provider);

  const file = snapshotPath(merchant, provider);
  if (!existsSync(file)) {
    throw new Error(`No snapshot found at ${file} — nothing to restore, or restore already ran. Refusing to guess.`);
  }
  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
  if (snapshot.merchantId !== merchant || snapshot.provider !== provider) {
    throw new Error('Snapshot merchant/provider mismatch — refusing to restore against the wrong target.');
  }

  const { createServiceClient } = await import('@/lib/supabase/server');
  const client = createServiceClient() as SupabaseLikeClient;
  const plan = buildRestorePlan(snapshot);
  try {
    await executeMutation(client, plan.merchantIntegration);
    if (plan.legacy) await executeMutation(client, plan.legacy);

    const restoredMerchantIntegration = await fetchRow(client, 'merchant_integrations', merchant, 'provider_id', provider);
    if (snapshot.merchantIntegration.existed) {
      if (!rowsMatchForRestore(snapshot.merchantIntegration.row, restoredMerchantIntegration)) {
        throw new Error(`Read-back verification FAILED for merchant_integrations — restored row does not match snapshot.\nExpected: ${JSON.stringify(forComparison(snapshot.merchantIntegration.row))}\nActual: ${JSON.stringify(forComparison(restoredMerchantIntegration))}`);
      }
    } else if (restoredMerchantIntegration !== null) {
      throw new Error('Read-back verification FAILED — merchant_integrations row still exists after cleanup delete.');
    }

    if (snapshot.legacyConnection.table) {
      const legacyTable = legacyTableFor(provider)!;
      const restoredLegacy = await fetchRow(client, snapshot.legacyConnection.table, merchant, legacyTable.matchColumn, legacyTable.matchValue);
      if (snapshot.legacyConnection.existed) {
        if (!rowsMatchForRestore(snapshot.legacyConnection.row, restoredLegacy)) {
          throw new Error(`Read-back verification FAILED for ${snapshot.legacyConnection.table} — restored row does not match snapshot.\nExpected: ${JSON.stringify(forComparison(snapshot.legacyConnection.row))}\nActual: ${JSON.stringify(forComparison(restoredLegacy))}`);
        }
      } else if (restoredLegacy !== null) {
        throw new Error(`Read-back verification FAILED — ${snapshot.legacyConnection.table} row still exists after cleanup delete.`);
      }
    }
    console.log('Read-back verification passed: restored row(s) match snapshot exactly.');
  } finally {
    unlinkSync(file);
    console.log(`Snapshot ${file} removed.`);
  }
}

async function main() {
  const { command } = parseArgs(process.argv.slice(2));
  if (command === 'apply') return applyPlan();
  if (command === 'restore') return restorePlan();
  console.error('Usage: integrationHealthFixture.ts <apply|restore> --merchant <id> --provider <provider> [--state <state>]');
  process.exit(1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
