import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from './server';

type TenantScope =
  | { kind: 'column'; column: string }
  | { kind: 'jsonb-array'; column: string };

export const TENANT_TABLES = [
  'access_audit_log',
  'audit_runs',
  'csv_upload_queue',
  'customer_activity_log',
  'customer_notes',
  'customer_profiles',
  'evidence_packages',
  'identity_false_positive_reports',
  'identity_sightings',
  'lookup_daily_counts',
  'merchant_members',
  'normalisation_learning',
  'processing_jobs',
  'transactions',
  'user_action_log',
  'user_permission_grants',
  'watchlist_appearances',
  'watchlist_entries',
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

const TENANT_SCOPES: Record<TenantTable, TenantScope> = {
  access_audit_log: { kind: 'column', column: 'merchant_id' },
  audit_runs: { kind: 'column', column: 'merchant_id' },
  csv_upload_queue: { kind: 'column', column: 'merchant_id' },
  customer_activity_log: { kind: 'column', column: 'merchant_id' },
  customer_notes: { kind: 'column', column: 'merchant_id' },
  customer_profiles: { kind: 'jsonb-array', column: 'merchant_ids' },
  evidence_packages: { kind: 'column', column: 'merchant_id' },
  identity_false_positive_reports: { kind: 'column', column: 'reported_by_merchant_id' },
  identity_sightings: { kind: 'column', column: 'merchant_id' },
  lookup_daily_counts: { kind: 'column', column: 'merchant_id' },
  merchant_members: { kind: 'column', column: 'merchant_id' },
  normalisation_learning: { kind: 'column', column: 'merchant_id' },
  processing_jobs: { kind: 'column', column: 'merchant_id' },
  transactions: { kind: 'column', column: 'merchant_id' },
  user_action_log: { kind: 'column', column: 'merchant_id' },
  user_permission_grants: { kind: 'column', column: 'merchant_id' },
  watchlist_appearances: { kind: 'column', column: 'merchant_id' },
  watchlist_entries: { kind: 'column', column: 'merchant_id' },
};

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

function scopeFor(table: string): TenantScope | null {
  return Object.prototype.hasOwnProperty.call(TENANT_SCOPES, table)
    ? TENANT_SCOPES[table as TenantTable]
    : null;
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
    return builder.contains(scope.column, [merchantId]);
  }
  return builder;
}

function wrapTableBuilder(builder: any, scope: TenantScope | null, merchantId: string): any {
  if (!scope) return builder;

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
          return wrapTableBuilder(builder, scopeFor(table), scopedMerchantId);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
