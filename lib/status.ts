/**
 * SINGLE SOURCE OF TRUTH — Status and badge configuration
 * All status colors, labels, and variants are defined here.
 * Components consume this config via the badge components.
 */

export type StatusVariant =
  | 'evidence-ready'
  | 'limited-evidence'
  | 'needs-review'
  | 'no-data'
  | 'network'
  | 'local'
  | 'integration-error'
  | 'default';

export interface StatusConfig {
  label: string;
  fgToken: string;
  bgToken: string;
  bdToken: string;
}

/**
 * Status vocabulary → token mapping
 * Maps semantic status labels to the token set they use.
 */
export const STATUS_CONFIG: Record<StatusVariant, StatusConfig> = {
  'evidence-ready': {
    label: 'Evidence ready',
    fgToken: '--success',
    bgToken: '--success-soft',
    bdToken: '--success-border',
  },
  'limited-evidence': {
    label: 'Limited evidence',
    fgToken: '--warning',
    bgToken: '--warning-soft',
    bdToken: '--warning-border',
  },
  'needs-review': {
    label: 'Needs review',
    fgToken: '--warning',
    bgToken: '--warning-soft',
    bdToken: '--warning-border',
  },
  'no-data': {
    label: 'No data',
    fgToken: '--neutral',
    bgToken: '--neutral-soft',
    bdToken: '--neutral-border',
  },
  network: {
    label: 'Network context',
    fgToken: '--network',
    bgToken: '--network-soft',
    bdToken: '--network-border',
  },
  local: {
    label: 'Merchant-local',
    fgToken: '--local',
    bgToken: '--local-soft',
    bdToken: '--local-border',
  },
  'integration-error': {
    label: 'Integration error',
    fgToken: '--critical',
    bgToken: '--critical-soft',
    bdToken: '--critical-border',
  },
  default: {
    label: 'Unknown',
    fgToken: '--neutral',
    bgToken: '--neutral-soft',
    bdToken: '--neutral-border',
  },
};

/**
 * Resolve a status string to a StatusVariant
 */
export function resolveStatusVariant(status: string | null | undefined): StatusVariant {
  if (!status) return 'default';
  const normalized = status.toLowerCase().replace(/[_\s]+/g, '-');

  // Evidence readiness
  if (normalized === 'evidence-ready' || normalized === 'ready' || normalized === 'verified') {
    return 'evidence-ready';
  }
  if (normalized === 'limited-evidence' || normalized === 'limited' || normalized === 'partial') {
    return 'limited-evidence';
  }
  if (normalized === 'needs-review' || normalized === 'review' || normalized === 'pending') {
    return 'needs-review';
  }
  if (normalized === 'no-data' || normalized === 'unknown') {
    return 'no-data';
  }

  // Provenance
  if (normalized === 'network' || normalized === 'cross-merchant') {
    return 'network';
  }
  if (normalized === 'local' || normalized === 'merchant-local') {
    return 'local';
  }

  // Errors
  if (normalized === 'error' || normalized === 'failed' || normalized === 'integration-error') {
    return 'integration-error';
  }

  return 'default';
}
