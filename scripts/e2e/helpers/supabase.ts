/**
 * Supabase access for the E2E suite: a service-role client, typed read helpers
 * for every claim-intelligence table the scenarios assert on, a generic
 * waitFor() poller, a best-effort CleanupRegistry, and the Scenario-8 core
 * customer-profile seed/teardown.
 *
 * Uses the raw @supabase/supabase-js client (service role) so reads see exactly
 * what the production ingestion path wrote. Table names come from the canonical
 * TABLES map — never raw strings.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { requireVar } from './envVars';
import { deleteShopifyCustomer } from './shopify';
import { deleteGorgiasTicketBestEffort, deleteGorgiasIntegrationBestEffort } from './gorgias';
import { warn } from './log';

let _client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is required');
  _client = createClient(url, requireVar('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export type SupportCaseIntakeRow = Record<string, unknown> & {
  id: string;
  merchant_id: string;
  external_case_id: string;
  customer_email_hash: string | null;
  is_claim: boolean;
  claim_type: string | null;
  claim_type_confidence: number | null;
  chargeback_threatened: boolean;
  outcome: string | null;
};

export async function getIntakeRow(
  externalCaseId: string,
  merchantId?: string
): Promise<SupportCaseIntakeRow | null> {
  let q = serviceClient()
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('*')
    .eq('provider', 'gorgias')
    .eq('external_case_id', externalCaseId);
  if (merchantId) q = q.eq('merchant_id', merchantId);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw new Error(`getIntakeRow failed: ${error.message}`);
  return (data as SupportCaseIntakeRow) ?? null;
}

export async function countIntakeRows(externalCaseId: string, merchantId?: string): Promise<number> {
  let q = serviceClient()
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'gorgias')
    .eq('external_case_id', externalCaseId);
  if (merchantId) q = q.eq('merchant_id', merchantId);
  const { count, error } = await q;
  if (error) throw new Error(`countIntakeRows failed: ${error.message}`);
  return count ?? 0;
}

export async function getConnectionRow(merchantId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient()
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('provider', 'gorgias')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getConnectionRow failed: ${error.message}`);
  return data ?? null;
}

export async function getClaimSummary(
  emailHash: string,
  merchantId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient()
    .from(TABLES.CUSTOMER_CLAIM_SUMMARY)
    .select('*')
    .eq('customer_email_hash', emailHash)
    .eq('merchant_id', merchantId)
    .maybeSingle();
  if (error) throw new Error(`getClaimSummary failed: ${error.message}`);
  return data ?? null;
}

export async function getLinkCandidates(emailHash: string): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await serviceClient()
    .from(TABLES.IDENTITY_LINK_CANDIDATES)
    .select('*')
    .or(`primary_customer_email_hash.eq.${emailHash},linked_customer_email_hash.eq.${emailHash}`);
  if (error) throw new Error(`getLinkCandidates failed: ${error.message}`);
  return data ?? [];
}

export async function getWebhookLog(externalCaseId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient()
    .from(TABLES.WEBHOOK_LOGS)
    .select('*')
    .eq('external_case_id', externalCaseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getWebhookLog failed: ${error.message}`);
  return data ?? null;
}

export async function getOrderClaimContext(
  supportCaseId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await serviceClient()
    .from(TABLES.ORDER_CLAIM_CONTEXT)
    .select('*')
    .eq('support_case_id', supportCaseId)
    .maybeSingle();
  if (error) throw new Error(`getOrderClaimContext failed: ${error.message}`);
  return data ?? null;
}

// ---------------------------------------------------------------------------
// waitFor
// ---------------------------------------------------------------------------

export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs = 10000,
  intervalMs = 500,
  label = 'condition'
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // First check immediately (our signed POST is synchronous, so data is usually
  // present on the first read).
  for (;;) {
    let ok = false;
    try {
      ok = await condition();
    } catch {
      ok = false;
    }
    if (ok) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for ${label} after ${timeoutMs}ms — check webhook URL is reachable and the app is deployed`
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ---------------------------------------------------------------------------
// Row cleanup
// ---------------------------------------------------------------------------

/**
 * Delete every claim-intelligence row keyed to a customer email hash across the
 * given merchants. support_case_intake deletion cascades to support_case_events
 * and order_claim_context (FK ON DELETE CASCADE).
 */
export async function deleteE2ERows(emailHash: string, merchantIds: string[]): Promise<void> {
  const svc = serviceClient();
  const ids = merchantIds.filter(Boolean);
  if (ids.length === 0) return;

  await svc
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .delete()
    .eq('customer_email_hash', emailHash)
    .in('merchant_id', ids);
  await svc
    .from(TABLES.CUSTOMER_CLAIM_SUMMARY)
    .delete()
    .eq('customer_email_hash', emailHash)
    .in('merchant_id', ids);
  await svc
    .from(TABLES.CUSTOMER_IDENTITY_SIGNALS)
    .delete()
    .eq('customer_email_hash', emailHash)
    .in('merchant_id', ids);
  await svc
    .from(TABLES.IDENTITY_LINK_CANDIDATES)
    .delete()
    .or(`primary_customer_email_hash.eq.${emailHash},linked_customer_email_hash.eq.${emailHash}`);
}

export async function deleteWebhookLogsForCase(externalCaseId: string): Promise<void> {
  await serviceClient().from(TABLES.WEBHOOK_LOGS).delete().eq('external_case_id', externalCaseId);
}

// ---------------------------------------------------------------------------
// Scenario 8 — minimal core customer_profiles seed (clearly marked E2E data)
// ---------------------------------------------------------------------------

export type SeededCoreProfile = { profileId: string };

/**
 * Insert the minimum core identity-graph row the Gorgias widget needs to resolve
 * a customer: a customer_profiles row whose primary_email matches and whose
 * merchant_ids include this merchant, with a >1 merchant footprint so the widget
 * surfaces network stats. Marked with an E2E fraud_flag and registered for
 * cleanup. Does NOT touch customer_claim_summary/support_case_intake — those
 * remain the real ingested data the widget test asserts on.
 */
export async function seedCoreCustomerProfile(input: {
  normEmail: string;
  merchantId: string;
  totalOrders: number;
  totalRefundClaims: number;
}): Promise<SeededCoreProfile> {
  const { data, error } = await serviceClient()
    .from(TABLES.CUSTOMER_PROFILES)
    .insert({
      primary_email: input.normEmail,
      emails: [input.normEmail],
      merchant_ids: [input.merchantId],
      risk_level: 'low',
      risk_score: 0,
      fraud_flags: ['e2e_test_seed'],
      total_orders: input.totalOrders,
      total_refund_claims: input.totalRefundClaims,
      // >1 so deriveNetworkStats() returns a non-null network for the widget.
      total_merchants_seen_at: 2,
      refund_timestamps: [new Date().toISOString()],
    })
    .select('id')
    .single();
  if (error) throw new Error(`seedCoreCustomerProfile failed: ${error.message}`);
  return { profileId: (data as { id: string }).id };
}

export async function deleteCoreCustomerProfile(profileId: string): Promise<void> {
  const svc = serviceClient();
  // profile_view_tokens FK → customer_profiles ON DELETE CASCADE; delete explicitly
  // first anyway in case the cascade is not present locally.
  await svc.from(TABLES.PROFILE_VIEW_TOKENS).delete().eq('profile_id', profileId);
  await svc.from(TABLES.CUSTOMER_PROFILES).delete().eq('id', profileId);
}

// ---------------------------------------------------------------------------
// CleanupRegistry
// ---------------------------------------------------------------------------

export type CleanupType =
  | 'shopify_customer'
  | 'gorgias_ticket'
  | 'gorgias_integration'
  | 'supabase_rows';

type CleanupEntry =
  | { kind: 'typed'; type: CleanupType; id: string; preserve?: boolean }
  | { kind: 'deferred'; label: string; fn: () => Promise<void> };

export class CleanupRegistry {
  private entries: CleanupEntry[] = [];

  constructor(private readonly merchantIds: string[]) {}

  /** Register a resource for best-effort teardown. */
  register(type: CleanupType, id: string, opts: { preserve?: boolean } = {}): void {
    this.entries.push({ kind: 'typed', type, id, preserve: opts.preserve });
  }

  /** Register an arbitrary async cleanup (seeded profiles, webhook logs, etc.). */
  defer(label: string, fn: () => Promise<void>): void {
    this.entries.push({ kind: 'deferred', label, fn });
  }

  /** Best-effort teardown in reverse registration order. Logs failures with IDs. */
  async run(): Promise<void> {
    const failures: string[] = [];
    for (const entry of [...this.entries].reverse()) {
      try {
        if (entry.kind === 'deferred') {
          await entry.fn();
          continue;
        }
        if (entry.preserve) continue;
        switch (entry.type) {
          case 'shopify_customer':
            await deleteShopifyCustomer(entry.id);
            break;
          case 'gorgias_ticket':
            await deleteGorgiasTicketBestEffort(Number(entry.id));
            // external_case_id == the Gorgias ticket id, so this clears the audit log too.
            await deleteWebhookLogsForCase(entry.id).catch(() => {});
            break;
          case 'gorgias_integration':
            await deleteGorgiasIntegrationBestEffort(Number(entry.id));
            break;
          case 'supabase_rows':
            await deleteE2ERows(entry.id, this.merchantIds);
            break;
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        failures.push(
          entry.kind === 'typed'
            ? `${entry.type}: ${entry.id} (${detail})`
            : `${entry.label} (${detail})`
        );
      }
    }
    if (failures.length > 0) {
      warn('Cleanup failed — delete manually:');
      for (const f of failures) console.log(`      ${f}`);
    }
  }
}
