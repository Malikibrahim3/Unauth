import type {
  ConnectionConfigurationState,
  ConnectionOperationalState,
} from '@/lib/connections/readModel';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';

export type ConnectionActionMode = {
  mode: 'connect' | 'repair' | 'retry_import' | 'sync' | 'sync_pending' | 'manage' | 'unavailable';
  connectLabel: 'Connect' | 'Reconnect' | null;
  syncLabel: 'Retry import' | 'Sync account' | null;
  syncDisabled: boolean;
  showManage: boolean;
  showDisconnect: boolean;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled connection badge: ${String(value)}`);
}

function unavailableMode(): ConnectionActionMode {
  return {
    mode: 'unavailable',
    connectLabel: null,
    syncLabel: null,
    syncDisabled: false,
    showManage: false,
    showDisconnect: false,
  };
}

function configuredMode(
  mode: ConnectionActionMode['mode'],
  options: Partial<Omit<ConnectionActionMode, 'mode'>> = {},
): ConnectionActionMode {
  return {
    mode,
    connectLabel: null,
    syncLabel: null,
    syncDisabled: false,
    showManage: true,
    showDisconnect: true,
    ...options,
  };
}

export function projectConnectionActionMode(input: {
  configuration: ConnectionConfigurationState;
  operational: ConnectionOperationalState;
  badge: EffectiveConnectionBadge;
  providerId: string;
}): ConnectionActionMode {
  const expectedOperational: ConnectionOperationalState = input.badge === 'disconnected'
    ? 'unknown'
    : input.badge === 'healthy' || input.badge === 'connection_verified'
      ? 'healthy'
      : 'attention';

  if (input.operational !== expectedOperational) return unavailableMode();

  if (input.configuration === 'not_configured') {
    return input.badge === 'disconnected'
      ? {
          mode: 'connect',
          connectLabel: 'Connect',
          syncLabel: null,
          syncDisabled: false,
          showManage: false,
          showDisconnect: false,
        }
      : unavailableMode();
  }

  if (input.badge === 'disconnected') return unavailableMode();
  const isShipBob = input.providerId === 'shipbob';

  switch (input.badge) {
    case 'error':
      return configuredMode('repair', { connectLabel: 'Reconnect', showManage: false });
    case 'not_syncing':
      return isShipBob
        ? configuredMode('retry_import', { syncLabel: 'Retry import' })
        : configuredMode('repair', { connectLabel: 'Reconnect', showManage: false });
    case 'stale':
    case 'no_data':
    case 'healthy':
      return isShipBob
        ? configuredMode('sync', { syncLabel: 'Sync account' })
        : configuredMode('manage');
    case 'sync_pending':
      return configuredMode('sync_pending', { syncDisabled: true });
    case 'connection_verified':
    case 'verification_unavailable':
      return configuredMode('manage');
    default:
      return assertNever(input.badge);
  }
}
