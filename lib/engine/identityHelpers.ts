/**
 * SINGLE SOURCE OF TRUTH — Identity cluster helper functions
 *
 * Shared utilities used by both identityMatching.ts and identityClusterBuilder.ts.
 * Do not duplicate these functions in either file.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

import type { NormalisedOrder } from './types';
import type { LinkerSignal } from '../linker';

// ---------------------------------------------------------------------------
// Raw ID extraction
// ---------------------------------------------------------------------------

/**
 * Raw identifiers lifted off a NormalisedOrder for downstream lookups.
 * These carry the canonical, non-hashed values written by csv/normalise.ts
 * through the _rawEmail / _rawIP / _rawAddress / _rawCardLast4
 * carry-through properties.
 */
export interface OrderRawIds {
  email: string;
  ip: string;
  address: string;
  card: string;
  phone: string;
  postcode: string;
  device: string;
  account: string;
  billingAddress: string;
}

export function extractRawIds(order: NormalisedOrder): OrderRawIds {
  const o = order as NormalisedOrder & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
    _rawPhone?: string | null;
    _rawPostcode?: string | null;
    _rawDevice?: string | null;
    _rawDeviceId?: string | null;
    _rawAccount?: string | null;
    _rawAccountId?: string | null;
    _rawBillingAddress?: string | null;
  };
  return {
    email: o._rawEmail ?? '',
    ip: o._rawIP ?? '',
    address: o._rawAddress ?? '',
    card: o._rawCardLast4 ?? '',
    phone: o._rawPhone ?? '',
    postcode: o._rawPostcode ?? '',
    device: o._rawDevice ?? o._rawDeviceId ?? '',
    account: o._rawAccount ?? o._rawAccountId ?? '',
    billingAddress: o._rawBillingAddress ?? '',
  };
}

// ---------------------------------------------------------------------------
// Anchor selection
// ---------------------------------------------------------------------------

/**
 * Choose a stable anchor (entityType, entityValue) for a cluster so that
 * downstream consumers (generateIdentityAlert, fraud_identity_clusters
 * upserts) can look the cluster up in the historical maps. The anchor
 * priority mirrors the linker signal strength order: card → phone →
 * device → account → email → postcode → ip.
 *
 * Values are taken from the FIRST member order's raw fields and therefore
 * use the same normalisation that populates ctx.historical*Map — do NOT
 * substitute the linker's own normalised form here.
 *
 * Accepts either Set<LinkerSignal> or LinkerSignal[] for compatibility with
 * both identityMatching.ts (uses Set) and identityClusterBuilder.ts (uses array).
 */
export function chooseAnchor(
  signals: Set<LinkerSignal> | LinkerSignal[],
  members: NormalisedOrder[]
): { entityType: string; entityValue: string } {
  const sigSet = signals instanceof Set ? signals : new Set(signals);
  const firstWith = (pred: (ids: OrderRawIds) => string | null | undefined) => {
    for (const m of members) {
      const ids = extractRawIds(m);
      const v = pred(ids);
      if (v) return v;
    }
    return '';
  };

  if (sigSet.has('card')) {
    const v = firstWith((i) => (i.card ? i.card.replace(/\D/g, '').slice(-4) : ''));
    if (v) return { entityType: 'card_last4', entityValue: v };
  }
  if (sigSet.has('phone')) {
    const v = firstWith((i) => (i.phone ? i.phone.replace(/\D/g, '').slice(-10) : ''));
    if (v) return { entityType: 'phone', entityValue: v };
  }
  if (sigSet.has('device')) {
    const v = firstWith((i) => i.device);
    if (v) return { entityType: 'device', entityValue: v };
  }
  if (sigSet.has('account')) {
    const v = firstWith((i) => i.account);
    if (v) return { entityType: 'account_id', entityValue: v };
  }
  if (sigSet.has('email')) {
    const v = firstWith((i) => (i.email ? i.email.toLowerCase().trim() : ''));
    if (v) return { entityType: 'email', entityValue: v };
  }
  if (sigSet.has('postcode')) {
    const v = firstWith((i) => (i.postcode ? i.postcode.toUpperCase().replace(/\s+/g, '') : ''));
    if (v) return { entityType: 'postcode', entityValue: v };
  }
  if (sigSet.has('ip')) {
    const v = firstWith((i) => i.ip);
    if (v) return { entityType: 'ip', entityValue: v };
  }
  return { entityType: 'unknown', entityValue: '' };
}

// ---------------------------------------------------------------------------
// Signal phrase rendering
// ---------------------------------------------------------------------------

export const SIGNAL_PHRASES: Partial<Record<LinkerSignal, string>> = {
  card: 'Same payment card (BIN + last 4) shared across orders',
  phone: 'Same phone number shared across orders',
  device: 'Same device fingerprint shared across orders',
  account: 'Same merchant account ID shared across orders',
  email: 'Same email base (dots/aliases ignored) shared across orders',
  postcode: 'Same postcode shared across orders',
  ip: 'Same IP address shared across orders (corroborating signal only)',
  name: 'Same customer name shared across orders',
  shipping_address: 'Same shipping address shared across orders',
  billing_address: 'Same billing address shared across orders',
};

export function reasonsFromSignals(signals: LinkerSignal[]): string[] {
  return signals.map((s) => SIGNAL_PHRASES[s] ?? s);
}
