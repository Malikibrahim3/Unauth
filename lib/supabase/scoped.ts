import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from './server';

type TenantScope =
  | { kind: 'column'; column: string }
  | { kind: 'jsonb-array'; column: string };

/**
 * TENANT SCOPING — v2 schema (post-cutover 2026-06-11)
 * ----------------------------------------------------
 * `createScopedClient` wraps the SERVICE-ROLE client, which bypasses RLS.
 * It is therefore the last line of defence for tenant isolation on any query
 * that runs through the service role. Every table a caller passes to
 * `.from()` MUST be classified here as exactly one of:
 *
 *   1. COLUMN_SCOPES — has a `merchant_id` column. The proxy auto-injects
 *      `.eq('merchant_id', merchantId)` on select/update/delete and sets
 *      `merchant_id` on insert/upsert. Verified against supabase/full_schema.sql
 *      + migrations (every entry below has a merchant_id column).
 *
 *   2. CALLER_SCOPED_TABLES — network-level tables that intentionally have NO
 *      `merchant_id` column (`identities` and the identity graph, plus
 *      `source_orders`, which is isolated via `job_id -> sync_jobs.merchant_id`).
 *      The proxy CANNOT scope these with a simple filter, so it passes the
 *      builder through UNCHANGED. Callers MUST prove ownership themselves
 *      (e.g. via merchantHelpers: getMerchantOwnedJobIds / assertMerchantOwnsJob
 *      / fetchMerchantScopedCustomerProfile). This is a documented contract,
 *      not an accident.
 *
 *   3. ANYTHING ELSE — the proxy THROWS (fail-closed). Historically this map
 *      listed v1 table names that no longer exist, so `scopeFor()` returned
 *      null and the proxy silently ran UNSCOPED service-role queries across all
 *      tenants. Failing closed makes that class of bug impossible: a mis-mapped
 *      or new table name errors loudly instead of leaking.
 */
// Tables actually routed through createScopedClient today. Each has a verified
// `merchant_id` column, so the proxy auto-injects the tenant filter. Keeping this
// list to the tables the scoped client is genuinely used on (rather than every
// merchant_id table in the schema) means the proxy scopes real call sites
// correctly, unknown tables fail closed, and the static isolation guard in
// tests/api/scopedClient.test.ts keeps its intended coverage. Add a table here
// only when a route starts routing it through the scoped client.
const COLUMN_SCOPES: Record<string, TenantScope> = {
  merchant_users: { kind: 'column', column: 'merchant_id' },
  sync_jobs: { kind: 'column', column: 'merchant_id' },
  support_payout_cases: { kind: 'column', column: 'merchant_id' },
  evidence_packages: { kind: 'column', column: 'merchant_id' },
  customer_notes: { kind: 'column', column: 'merchant_id' },
  customer_activity_log: { kind: 'column', column: 'merchant_id' },
  merchant_identity_state: { kind: 'column', column: 'merchant_id' },
};

/**
 * Network-level / parent-scoped tables with NO merchant_id column. The proxy
 * passes these through unchanged; the CALLER is responsible for proving
 * ownership (see the contract note above). Adding a table here is an explicit,
 * reviewable decision — never a silent fallback.
 */
const CALLER_SCOPED_TABLES: ReadonlySet<string> = new Set([
  'merchants', // tenant identity IS the row id; callers filter by .eq('id', merchantId)
  'identities',
  'identity_profiles',
  'identity_members',
  'identity_identifiers',
  'identity_edges',
  'identity_resolution_events',
  'source_orders', // isolated via job_id -> sync_jobs.merchant_id at call sites
  'sync_job_chunks', // isolated via job_id -> sync_jobs.merchant_id
  'claim_outcomes', // isolated via parent support_payout_cases
]);

export const TENANT_TABLES = Object.keys(COLUMN_SCOPES) as readonly string[];

export type ScopedSupabaseClient = SupabaseClient & {
  readonly merchantId: string;
  from(table: string): any;
};

function normaliseMerchantId(merchantId: string | null | undefined): string {
  const value = typeof merchantId === 'string' ? merchantId.trim() : '';
  if (!value) {
    throw new Error('createScopedClient requires a merchantId');
  }
  return value;
}

function withColumnTenant(row: Record<string, unknown>, column: string, merchantId: string) {
  const existing = row[column];
  if (existing != null && existing !== merchantId) {
    throw new Error(`Tenant scope violation: ${column} does not match scoped merchant`);
  }
  return { ...row, [column]: merchantId };
}

function withJsonbArrayTenant(row: Record<string, unknown>, column: string, merchantId: string) {
  const existing = row[column];
  if (existing == null) {
    return { ...row, [column]: [merchantId] };
  }
  if (!Array.isArray(existing) || !existing.includes(merchantId)) {
    throw new Error(`Tenant scope violation: ${column} does not include scoped merchant`);
  }
  return row;
}

function injectTenantValue(value: unknown, scope: TenantScope, merchantId: string): unknown {
  if (Array.isArray(value)) {
    return value.map((row) => injectTenantValue(row, scope, merchantId));
  }

  if (!value || typeof value !== 'object') return value;

  const row = value as Record<string, unknown>;
  if (scope.kind === 'column') {
    return withColumnTenant(row, scope.column, merchantId);
  }
  return withJsonbArrayTenant(row, scope.column, merchantId);
}

function applyTenantFilter(builder: any, scope: TenantScope, merchantId: string): any {
  if (!builder || typeof builder !== 'object') return builder;
  if (scope.kind === 'column' && typeof builder.eq === 'function') {
    return builder.eq(scope.column, merchantId);
  }
  if (scope.kind === 'jsonb-array' && typeof builder.contains === 'function') {
    return builder.or(`${scope.column}.cs.${JSON.stringify([merchantId])}`);
  }
  return builder;
}

function wrapTableBuilder(builder: any, scope: TenantScope, merchantId: string): any {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'select') {
        return (...args: unknown[]) => applyTenantFilter(target.select(...args), scope, merchantId);
      }
      if (prop === 'update') {
        return (...args: unknown[]) => applyTenantFilter(target.update(...args), scope, merchantId);
      }
      if (prop === 'delete') {
        return (...args: unknown[]) => applyTenantFilter(target.delete(...args), scope, merchantId);
      }
      if (prop === 'insert') {
        return (values: unknown, ...args: unknown[]) =>
          target.insert(injectTenantValue(values, scope, merchantId), ...args);
      }
      if (prop === 'upsert') {
        return (values: unknown, ...args: unknown[]) =>
          target.upsert(injectTenantValue(values, scope, merchantId), ...args);
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function createScopedClient(
  merchantId: string | null | undefined,
  baseClient: SupabaseClient = createServiceClient()
): ScopedSupabaseClient {
  const scopedMerchantId = normaliseMerchantId(merchantId);

  return new Proxy(baseClient as ScopedSupabaseClient, {
    get(target, prop, receiver) {
      if (prop === 'merchantId') return scopedMerchantId;
      if (prop === 'from') {
        return (table: string) => {
          const builder = target.from(table as never);
          const scope = Object.prototype.hasOwnProperty.call(COLUMN_SCOPES, table)
            ? COLUMN_SCOPES[table]
            : null;
          if (scope) {
            return wrapTableBuilder(builder, scope, scopedMerchantId);
          }
          if (CALLER_SCOPED_TABLES.has(table)) {
            // Network-level table with no merchant_id — ownership must be proven
            // by the caller. Passed through intentionally (see contract above).
            return builder;
          }
          // Fail closed: never run an unscoped service-role query on an
          // unclassified table.
          throw new Error(
            `createScopedClient: no tenant scope defined for table '${table}'. ` +
              `Refusing to run an unscoped service-role query. Classify it in ` +
              `COLUMN_SCOPES (has merchant_id) or CALLER_SCOPED_TABLES ` +
              `(network-level, ownership proven at call site) in lib/supabase/scoped.ts.`
          );
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
