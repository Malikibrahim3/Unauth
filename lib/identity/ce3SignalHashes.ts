import type { NormalisedOrder } from '@/lib/engine/types';

export const CE3_ACCEPTED_SIGNAL_NAMES = [
  'deviceMatch',
  'ipCluster',
  'emailVariant',
  'addressCluster',
  'phoneMatch',
  'accountLink',
] as const;
export type CE3AcceptedSignal = (typeof CE3_ACCEPTED_SIGNAL_NAMES)[number];
export type Ce3SignalHashes = Partial<Record<CE3AcceptedSignal, string>>;

/** WRITE: derive the per-order CE3 fingerprint from a NormalisedOrder's existing hashes.
 *  Deliberately excludes card data — not a CE3.0-accepted signal.
 *  Deliberately excludes postcode — not a standalone CE3.0 shipping-address match. */
export function buildCe3SignalHashes(
  order: Pick<
    NormalisedOrder,
    'emailHash' | 'addressHash' | 'phoneHash' | 'ipHash' | 'deviceIdHash' | 'accountIdHash'
  >
): Ce3SignalHashes {
  const out: Ce3SignalHashes = {};
  if (order.deviceIdHash) out.deviceMatch = order.deviceIdHash;
  if (order.ipHash) out.ipCluster = order.ipHash;
  if (order.emailHash) out.emailVariant = order.emailHash;
  if (order.addressHash) out.addressCluster = order.addressHash;
  if (order.phoneHash) out.phoneMatch = order.phoneHash;
  if (order.accountIdHash) out.accountLink = order.accountIdHash;
  return out;
}

/** READ: validate a jsonb blob into a typed, accepted-only hash map.
 *  Empty strings are rejected — empty never matches empty. */
export function extractCe3AcceptedHashes(raw: unknown): Ce3SignalHashes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: Ce3SignalHashes = {};
  for (const k of CE3_ACCEPTED_SIGNAL_NAMES) {
    const v = src[k];
    if (typeof v === 'string' && v.length > 0) out[k] = v;
  }
  return out;
}
