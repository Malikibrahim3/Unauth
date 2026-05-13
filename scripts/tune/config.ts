/**
 * Tunable configuration — mirrors all hardcoded thresholds from the codebase.
 * The tuning loop modifies a copy of this object, never the production source files
 * during testing. Once optimal values are found, they are applied to the source.
 */
import type { TuneConfig } from './types';

export const DEFAULT_CONFIG: TuneConfig = {
  // lib/linker.ts: const LINK_THRESHOLD = 30
  LINK_THRESHOLD: 30,
  // lib/linker.ts: const POSSIBLE_THRESHOLD = 15
  POSSIBLE_THRESHOLD: 15,

  // lib/linker.ts: FAMILY_TIERS
  phone_exact: 30,
  phone_partial: 15,
  device_exact: 30,
  account_exact: 25,
  shipping_exact: 22,
  shipping_partial: 12,
  billing_exact: 22,
  billing_partial: 12,
  billing_cross: 18,
  email_exact: 35,
  email_username: 15,
  name_exact: 18,
  name_fuzzy: 10,
  card_fingerprint: 30,
  card_full: 12,
  card_last4: 8,
  postcode_full: 10,
  postcode_outward: 5,
  ip_exact: 8,
  ip_subnet: 4,

  // lib/analysis/entityResolution.ts
  ER_IP_RISK_GATE: 50,
  ER_CONF_EMAIL: 99,
  ER_CONF_CARD: 90,
  ER_CONF_IP_ADDR: 85,
  ER_CONF_IP_ONLY: 60,
};

export function cloneConfig(c: TuneConfig): TuneConfig {
  return { ...c };
}
