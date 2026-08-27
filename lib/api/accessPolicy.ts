import type { SupabaseClient } from '@supabase/supabase-js';
import { getMerchantSubscriptionRow } from '@/lib/billing/merchantBilling';

export const API_SCOPES = [
  'customers:read',
  'cases:read',
  'cases:write',
  'evidence:read',
  'evidence:write',
  'imports:read',
  'imports:write',
  'lookup:read',
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, string> = {
  'customers:read': 'Read customers and create customer profile links',
  'cases:read': 'Read case and helpdesk context',
  'cases:write': 'Evaluate gates and record escalation requests',
  'evidence:read': 'Read evidence packages and request downloads',
  'evidence:write': 'Create evidence packages',
  'imports:read': 'Read ingestion event status',
  'imports:write': 'Import customers, orders, cases, and events',
  'lookup:read': 'Run credit-backed context lookups',
};

export const API_RATE_LIMITS_PER_MINUTE = [15, 30, 60, 120] as const;
export type ApiRateLimit = (typeof API_RATE_LIMITS_PER_MINUTE)[number];

const API_ENABLED_SUBSCRIPTION_STATUSES = new Set(['active', 'grace_period']);

/**
 * Canonical server-only commercial gate for machine API access. It reads the
 * provider-confirmed subscription row and intentionally ignores preview
 * cookies and feature-flag bypasses.
 */
export async function merchantHasMachineApiAccess(
  service: SupabaseClient,
  merchantId: string,
): Promise<boolean> {
  const subscription = await getMerchantSubscriptionRow(service, merchantId);
  return subscription?.planId === 'scale'
    && API_ENABLED_SUBSCRIPTION_STATUSES.has(subscription.status);
}

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}
