/**
 * Child-before-parent deferred reconciliation.
 *
 * When a child record arrives before its parent (e.g. a refund before its
 * order), it must be RETAINED as pending reconciliation and retried after the
 * parent arrives — never acknowledged-and-discarded. This resolves a parent by
 * its external id via the source registry; if the parent is absent, callers
 * raise DeferredReconciliation so the ingestion inbox retries the event
 * (status failed + backoff) instead of completing it.
 *
 * See ARCHITECTURE.md §3 / §6.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export class DeferredReconciliation extends Error {
  readonly deferred = true as const;
  readonly parentType: string;
  readonly parentExternalId: string;
  constructor(parentType: string, parentExternalId: string) {
    super(`parent ${parentType}:${parentExternalId} not yet ingested — deferring`);
    this.name = 'DeferredReconciliation';
    this.parentType = parentType;
    this.parentExternalId = parentExternalId;
  }
}

export type ParentLookupResult =
  | { found: true; canonicalEntityId: string; canonicalEntityType: string }
  | { found: false };

/**
 * Resolve a parent record by its source external id. Returns the canonical
 * entity id when the parent has been ingested (canonical_entity_id set), else
 * `{ found: false }` — the caller decides to defer.
 */
export async function resolveParentByExternalId(
  client: SupabaseClient,
  merchantId: string,
  sourceEntityType: string,
  externalId: string,
  scope: { connectionId?: string | null; sourceAccountId?: string | null },
): Promise<ParentLookupResult> {
  if (!scope.connectionId && !scope.sourceAccountId) throw new Error('reconciliation_scope_required');
  let query = client
    .from(TABLES.SOURCE_RECORDS)
    .select('canonical_entity_id, canonical_entity_type')
    .eq('merchant_id', merchantId)
    .eq('source_entity_type', sourceEntityType)
    .eq('external_id', externalId)
    .not('canonical_entity_id', 'is', null);
  if (scope.connectionId) query = query.eq('connection_id', scope.connectionId);
  if (scope.sourceAccountId) query = query.eq('source_account_id', scope.sourceAccountId);
  const { data, error } = await query
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`parent_lookup_failed: ${error.message}`);
  const row = data as { canonical_entity_id: string | null; canonical_entity_type: string | null } | null;
  if (!row || !row.canonical_entity_id) return { found: false };
  return { found: true, canonicalEntityId: row.canonical_entity_id, canonicalEntityType: row.canonical_entity_type ?? sourceEntityType };
}

/**
 * Resolve a required parent or throw DeferredReconciliation. Use in ingestion
 * handlers so a missing parent retries rather than silently dropping the child.
 */
export async function requireParentOrDefer(
  client: SupabaseClient,
  merchantId: string,
  sourceEntityType: string,
  externalId: string | null | undefined,
  scope: { connectionId?: string | null; sourceAccountId?: string | null },
): Promise<string | null> {
  if (!externalId) return null; // no parent reference on this child — nothing to defer on
  const result = await resolveParentByExternalId(client, merchantId, sourceEntityType, externalId, scope);
  if (!result.found) throw new DeferredReconciliation(sourceEntityType, externalId);
  return result.canonicalEntityId;
}
