/**
 * Runtime capability availability resolver.
 *
 * Declared support (what a connector CAN do) is combined with granted scopes,
 * the merchant's write-back setting, and connection health to decide what is
 * actually available right now:
 *
 *   declared support + granted scope + merchant writeback + connection health
 *     -> enabled | permission_missing | merchant_disabled | degraded | unsupported
 *
 * See ARCHITECTURE.md §5.
 */
import type { ConnectorCapability, RuntimeAvailability, RuntimeCapability } from '@/lib/connectors/capabilities';

export type ConnectionHealthInput = {
  status: string; // merchant_integrations.status
  grantedScopes: string[];
  writebackEnabled: boolean;
};

const DEGRADED_STATUSES = new Set(['degraded', 'error', 'connection_error', 'revoked', 'disabled', 'not_connected', 'pending']);
const WRITE_LEVELS = new Set(['write', 'act']);

export function resolveCapabilityAvailability(
  capability: ConnectorCapability,
  health: ConnectionHealthInput,
): RuntimeCapability {
  const decide = (): { availability: RuntimeAvailability; reason: string } => {
    if (capability.support === 'unsupported') {
      return { availability: 'unsupported', reason: 'Connector does not support this capability.' };
    }
    if (DEGRADED_STATUSES.has(health.status)) {
      return { availability: 'degraded', reason: `Connection status is '${health.status}'.` };
    }
    const missingScopes = capability.requiredScopes.filter((s) => !health.grantedScopes.includes(s));
    if (missingScopes.length > 0) {
      return {
        availability: 'permission_missing',
        reason: `Missing scopes: ${missingScopes.join(', ')}.`,
      };
    }
    if (WRITE_LEVELS.has(capability.level) && !health.writebackEnabled) {
      return { availability: 'merchant_disabled', reason: 'Merchant write-back is disabled.' };
    }
    return { availability: 'enabled', reason: 'Available.' };
  };

  const { availability, reason } = decide();
  return { ...capability, availability, availabilityReason: reason };
}

export function resolveConnectorCapabilities(
  capabilities: ConnectorCapability[],
  health: ConnectionHealthInput,
): RuntimeCapability[] {
  return capabilities.map((c) => resolveCapabilityAvailability(c, health));
}
