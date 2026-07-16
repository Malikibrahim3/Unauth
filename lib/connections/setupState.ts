export type MerchantSetupState =
  | 'fresh'
  | 'order_source_only_empty'
  | 'order_source_only_with_data'
  | 'helpdesk_only_empty'
  | 'helpdesk_only_with_data'
  | 'csv_only'
  | 'fully_connected_empty'
  | 'fully_connected_with_data'
  | 'stale_existing_data';

type SetupConnectionState = {
  bothConnected: boolean;
  orderSourceOnlyConnected: boolean;
  helpdeskOnlyConnected: boolean;
};

type SetupDataPresence = {
  hasAnyData: boolean;
  hasCsvImports: boolean;
  hasOrderSourceSignals: boolean;
  hasHelpdeskClaims: boolean;
};

/**
 * Pure resolver: maps the canonical connection state + data presence to a
 * single setup state. No I/O, so it is safe for client components and tests.
 */
export function resolveMerchantSetupState(
  connection: SetupConnectionState,
  presence: SetupDataPresence,
): MerchantSetupState {
  const hasData = presence.hasAnyData;

  if (connection.bothConnected) {
    return hasData ? 'fully_connected_with_data' : 'fully_connected_empty';
  }

  if (connection.orderSourceOnlyConnected) {
    return hasData ? 'order_source_only_with_data' : 'order_source_only_empty';
  }

  if (connection.helpdeskOnlyConnected) {
    return hasData ? 'helpdesk_only_with_data' : 'helpdesk_only_empty';
  }

  if (!hasData) return 'fresh';

  const csvOnly =
    presence.hasCsvImports &&
    !presence.hasOrderSourceSignals &&
    !presence.hasHelpdeskClaims;

  return csvOnly ? 'csv_only' : 'stale_existing_data';
}

const FULL_GATE_STATES: ReadonlySet<MerchantSetupState> = new Set([
  'fresh',
  'order_source_only_empty',
  'helpdesk_only_empty',
  'fully_connected_empty',
]);

export function setupStateHasUsefulData(state: MerchantSetupState): boolean {
  return !FULL_GATE_STATES.has(state);
}

export function shouldFullGate(state: MerchantSetupState): boolean {
  return FULL_GATE_STATES.has(state);
}
