import type { SupabaseClient } from '@supabase/supabase-js';
import { getConnectionState, type ConnectionState } from './getConnectionState';
import {
  getMerchantDataPresence,
  type MerchantDataPresence,
} from '@/lib/supabase/getMerchantDataPresence';

export type MerchantSetupState =
  | 'fresh'
  | 'shopify_only_empty'
  | 'shopify_only_with_data'
  | 'helpdesk_only_empty'
  | 'helpdesk_only_with_data'
  | 'csv_only'
  | 'fully_connected_empty'
  | 'fully_connected_with_data'
  | 'stale_existing_data';

/**
 * Pure resolver: maps the canonical connection state + data presence to a
 * single setup state. No I/O — kept pure so every state is unit-testable.
 *
 * The ordering matters: connection topology is decided first, then refined by
 * whether useful data has actually arrived.
 */
export function resolveMerchantSetupState(
  connection: ConnectionState,
  presence: MerchantDataPresence,
): MerchantSetupState {
  const hasData = presence.hasAnyData;

  if (connection.bothConnected) {
    return hasData ? 'fully_connected_with_data' : 'fully_connected_empty';
  }

  if (connection.shopifyOnlyConnected) {
    return hasData ? 'shopify_only_with_data' : 'shopify_only_empty';
  }

  if (connection.helpdeskOnlyConnected) {
    return hasData ? 'helpdesk_only_with_data' : 'helpdesk_only_empty';
  }

  // Neither integration is connected.
  if (!hasData) return 'fresh';

  // Data exists with no live integrations. If the only data source is CSV/import
  // jobs, this is a legacy CSV-only merchant; otherwise it is previously-synced
  // (e.g. Shopify) data whose integrations are no longer active.
  const csvOnly =
    presence.hasCsvImports &&
    !presence.hasShopifySignals &&
    !presence.hasHelpdeskClaims;

  return csvOnly ? 'csv_only' : 'stale_existing_data';
}

/**
 * Setup states where no useful data exists and a required source is missing —
 * the only situations in which a page may show a full first-run gate. Any other
 * state must render real content (with a non-blocking completeness prompt when
 * setup is incomplete).
 */
const FULL_GATE_STATES: ReadonlySet<MerchantSetupState> = new Set([
  'fresh',
  'shopify_only_empty',
  'helpdesk_only_empty',
  'fully_connected_empty',
]);

export function setupStateHasUsefulData(state: MerchantSetupState): boolean {
  return !FULL_GATE_STATES.has(state);
}

export function shouldFullGate(state: MerchantSetupState): boolean {
  return FULL_GATE_STATES.has(state);
}

export type MerchantSetupSnapshot = {
  state: MerchantSetupState;
  connection: ConnectionState;
  presence: MerchantDataPresence;
};

/**
 * Convenience fetcher: loads connection state + data presence and resolves the
 * setup state in one call. Pages that already loaded one or both can call
 * resolveMerchantSetupState directly to avoid duplicate queries.
 */
export async function getMerchantSetupState(
  serviceClient: SupabaseClient,
  merchantId: string,
  userId?: string,
): Promise<MerchantSetupSnapshot> {
  const [connection, presence] = await Promise.all([
    getConnectionState(serviceClient, merchantId),
    getMerchantDataPresence(serviceClient, merchantId, userId),
  ]);
  return {
    state: resolveMerchantSetupState(connection, presence),
    connection,
    presence,
  };
}
