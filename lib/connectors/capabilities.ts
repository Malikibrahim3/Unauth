/**
 * Connector capability model.
 *
 * Replaces the boolean `ConnectorCapabilityMap` with typed capability records
 * that carry level, support, default enablement, required scopes, and risk.
 * Declared support (what the connector CAN do) is separate from runtime
 * availability (what it can do RIGHT NOW for a given connection). See
 * `lib/connectors/runtime.ts` for the availability resolver.
 *
 * See ARCHITECTURE.md §5.
 */

export type CapabilityLevel = 'read' | 'sync' | 'link' | 'write' | 'act' | 'subscribe';
export type CapabilitySupport = 'supported' | 'partial' | 'unsupported';
export type CapabilityRisk = 'low' | 'medium' | 'high';

export type ConnectorCapability = {
  /** e.g. orders.read, refunds.subscribe, tickets.write_note */
  id: string;
  level: CapabilityLevel;
  support: CapabilitySupport;
  enabledByDefault: boolean;
  requiredScopes: string[];
  risk: CapabilityRisk;
  description: string;
};

/**
 * High-risk capabilities that must remain unsupported or merchant-disabled in
 * MVP+ (no automatic refund issuance, denial, or claim submission).
 */
export const FORBIDDEN_MVP_CAPABILITIES: ReadonlySet<string> = new Set([
  'refund.issue',
  'request.deny',
  'claim.submit',
]);

export type RuntimeAvailability =
  | 'enabled'
  | 'permission_missing'
  | 'merchant_disabled'
  | 'degraded'
  | 'unsupported';

export type RuntimeCapability = ConnectorCapability & {
  availability: RuntimeAvailability;
  availabilityReason: string;
};

/** Convenience constructor so provider manifests stay terse. */
export function capability(
  id: string,
  level: CapabilityLevel,
  opts: Partial<Omit<ConnectorCapability, 'id' | 'level'>> = {},
): ConnectorCapability {
  const support = opts.support ?? 'supported';
  // Enforce the MVP+ boundary structurally: a forbidden capability can never be
  // declared as anything but unsupported.
  const forced = FORBIDDEN_MVP_CAPABILITIES.has(id) ? 'unsupported' : support;
  return {
    id,
    level,
    support: forced,
    enabledByDefault: forced === 'unsupported' ? false : opts.enabledByDefault ?? true,
    requiredScopes: opts.requiredScopes ?? [],
    risk: opts.risk ?? (level === 'act' ? 'high' : level === 'write' ? 'medium' : 'low'),
    description: opts.description ?? id,
  };
}
