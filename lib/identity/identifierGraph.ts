import type { NormalisedOrder } from '@/lib/engine/types';
import type { ScoredOrder } from '@/lib/engine/types';

/** v1 identifier types with an active write path. */
export const V1_IDENTIFIER_TYPES = [
  'normalized_email_hash',
  'phone_e164_hash',
  'full_normalized_shipping_address_hash',
  'full_normalized_billing_address_hash',
  'platform_customer_id',
  'helpdesk_customer_id',
  'platform_order_id',
  'helpdesk_ticket_id',
  'visitor_id',
  'device_fingerprint',
] as const;

export type V1IdentifierType = (typeof V1_IDENTIFIER_TYPES)[number];

export type IdentifierRef = {
  type: V1IdentifierType;
  hash: string;
  rawVsHashedStorage?: 'hashed' | 'raw';
};

export type IdentifierGraphSourceProvider =
  | 'shopify'
  | 'bigcommerce'
  | 'woocommerce'
  | 'gorgias'
  | 'csv'
  | 'manual'
  | 'unknown';

type RawOrderFields = {
  _rawAccountId?: string | null;
};

/**
 * Canonical edge direction — must run before every edge upsert.
 * Matches DB CHECK: (left_type, left_hash) < (right_type, right_hash).
 */
export function canonicalizeEdgePair(
  left: IdentifierRef,
  right: IdentifierRef
): { left: IdentifierRef; right: IdentifierRef } {
  const leftKey = `${left.type}:${left.hash}`;
  const rightKey = `${right.type}:${right.hash}`;
  if (leftKey > rightKey) {
    return { left: right, right: left };
  }
  return { left, right };
}

function pushIdentifier(
  out: IdentifierRef[],
  type: V1IdentifierType,
  hash: string,
  rawVsHashedStorage: 'hashed' | 'raw' = 'hashed'
): void {
  const trimmed = hash.trim();
  if (!trimmed) return;
  out.push({ type, hash: trimmed, rawVsHashedStorage });
}

/** Extract v1 identifiers present on a normalised order (no ip/device/card). */
export function extractV1IdentifiersFromOrder(order: NormalisedOrder): IdentifierRef[] {
  const raw = order as NormalisedOrder & RawOrderFields;
  const identifiers: IdentifierRef[] = [];

  if (order.emailHash) {
    pushIdentifier(identifiers, 'normalized_email_hash', order.emailHash, 'hashed');
  }
  if (order.phoneHash) {
    pushIdentifier(identifiers, 'phone_e164_hash', order.phoneHash, 'hashed');
  }
  if (order.addressHash) {
    pushIdentifier(
      identifiers,
      'full_normalized_shipping_address_hash',
      order.addressHash,
      'hashed'
    );
  }
  if (order.billingAddressHash) {
    pushIdentifier(
      identifiers,
      'full_normalized_billing_address_hash',
      order.billingAddressHash,
      'hashed'
    );
  }
  if (raw._rawAccountId?.trim()) {
    pushIdentifier(identifiers, 'platform_customer_id', raw._rawAccountId.trim(), 'raw');
  }
  if (order.orderId?.trim()) {
    pushIdentifier(identifiers, 'platform_order_id', order.orderId.trim(), 'raw');
  }

  return identifiers;
}

/** All co-occurrence pairs among identifiers on the same order row. */
export function buildV1EdgePairsFromIdentifiers(
  identifiers: IdentifierRef[]
): Array<{ left: IdentifierRef; right: IdentifierRef }> {
  const pairs: Array<{ left: IdentifierRef; right: IdentifierRef }> = [];
  for (let i = 0; i < identifiers.length; i++) {
    for (let j = i + 1; j < identifiers.length; j++) {
      pairs.push(canonicalizeEdgePair(identifiers[i], identifiers[j]));
    }
  }
  return pairs;
}

export function accumulateV1IdentifierGraphFromScoredBatch(scored: ScoredOrder[]): {
  identifiers: IdentifierRef[];
  edgeCounts: Map<
    string,
    {
      left: IdentifierRef;
      right: IdentifierRef;
      count: number;
    }
  >;
} {
  const identifierSet = new Map<string, IdentifierRef>();
  const edgeCounts = new Map<
    string,
    {
      left: IdentifierRef;
      right: IdentifierRef;
      count: number;
    }
  >();

  for (const { order } of scored) {
    const identifiers = extractV1IdentifiersFromOrder(order);
    for (const id of identifiers) {
      identifierSet.set(`${id.type}:${id.hash}`, id);
    }
    for (const pair of buildV1EdgePairsFromIdentifiers(identifiers)) {
      const key = `${pair.left.type}:${pair.left.hash}|${pair.right.type}:${pair.right.hash}`;
      const existing = edgeCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        edgeCounts.set(key, { ...pair, count: 1 });
      }
    }
  }

  return {
    identifiers: Array.from(identifierSet.values()),
    edgeCounts,
  };
}

export function mapIngestionSourceToGraphProvider(
  source: string | undefined
): IdentifierGraphSourceProvider {
  switch (source) {
    case 'shopify':
    case 'bigcommerce':
    case 'woocommerce':
    case 'gorgias':
    case 'csv':
    case 'manual':
      return source;
    default:
      return 'unknown';
  }
}

export function isV1IdentifierType(type: string): type is V1IdentifierType {
  return (V1_IDENTIFIER_TYPES as readonly string[]).includes(type);
}

/**
 * Mirrors bulk_upsert_identifier_co_occurrence_edges link_strength arithmetic.
 * previousSeenCount=0 models a first insert; previousSeenCount>0 models ON CONFLICT.
 */
export function computeLinkStrengthAfterUpsert(
  previousSeenCount: number,
  countDelta: number
): { seenCount: number; linkStrength: number } {
  const seenCount = previousSeenCount + countDelta;
  const linkStrength = 1.0 + (seenCount - 1) * 0.5;
  return { seenCount, linkStrength };
}
