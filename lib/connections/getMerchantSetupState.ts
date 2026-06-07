import type { SupabaseClient } from '@supabase/supabase-js';
import { getConnectionState, type ConnectionState } from './getConnectionState';
import {
  getMerchantDataPresence,
  type MerchantDataPresence,
} from '@/lib/supabase/getMerchantDataPresence';
import {
  resolveMerchantSetupState,
  type MerchantSetupState,
} from '@/lib/connections/setupState';

export {
  resolveMerchantSetupState,
  setupStateHasUsefulData,
  shouldFullGate,
  type MerchantSetupState,
} from '@/lib/connections/setupState';

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
