import { hashIdentifier } from '@/lib/identity/hash';
import type { V1IdentifierType } from '@/lib/identity/identifierGraph';

/** Legacy fraud_entities row subset used by Step 6 backfill (read-only source). */
export type FraudEntityBackfillRow = {
  id: string;
  entity_type: string;
  entity_value: string;
  first_seen: string;
  last_seen: string;
};

export type IdentityIdentifierSourceProvider =
  | 'shopify'
  | 'bigcommerce'
  | 'woocommerce'
  | 'gorgias'
  | 'csv'
  | 'manual'
  | 'unknown';

/** Target row for identity_identifiers upsert. */
export type IdentityIdentifierBackfillRow = {
  identifier_type: V1IdentifierType;
  identifier_hash: string;
  source_provider: IdentityIdentifierSourceProvider;
  raw_vs_hashed_storage: 'hashed';
  first_seen_at: string;
  last_seen_at: string;
};

export const BACKFILL_LEGACY_ENTITY_TYPE_MAP = {
  email: 'normalized_email_hash',
  address: 'full_normalized_shipping_address_hash',
} as const satisfies Record<string, V1IdentifierType>;

export const BACKFILL_SKIPPED_LEGACY_ENTITY_TYPES = new Set([
  'ip',
  'card_last4',
  'phone',
]);

/** Allowed by identity_identifiers.source_provider CHECK — legacy_backfill is not. */
export const BACKFILL_SOURCE_PROVIDER = 'manual' as const;

/**
 * `manual` is the closest allowed source_provider for legacy backfill rows.
 * These identifiers are not manually entered — `legacy_backfill` is not currently
 * permitted by the identity_identifiers.source_provider CHECK constraint.
 * Do not alter that CHECK just for this backfill.
 */
export type MapFraudEntityResult =
  | { ok: true; row: IdentityIdentifierBackfillRow }
  | { ok: false; reason: 'skipped_type' | 'skipped_unknown_type' | 'skipped_invalid_value'; entity_type: string };

export type BackfillRunStats = {
  totalScanned: number;
  mapped: number;
  skippedByType: Record<string, number>;
  skippedInvalidValue: number;
  skippedUnknownType: number;
  insertedOrUpserted: number;
  proposedUpserts: number;
  errors: number;
};

export function createEmptyBackfillStats(): BackfillRunStats {
  return {
    totalScanned: 0,
    mapped: 0,
    skippedByType: {},
    skippedInvalidValue: 0,
    skippedUnknownType: 0,
    insertedOrUpserted: 0,
    proposedUpserts: 0,
    errors: 0,
  };
}

function bumpSkipType(stats: BackfillRunStats, entityType: string): void {
  stats.skippedByType[entityType] = (stats.skippedByType[entityType] ?? 0) + 1;
}

/**
 * Map one fraud_entities row to identity_identifiers payload.
 * Uses hashIdentifier(entity_value) directly — entity_value is already normalised plaintext.
 */
export function mapFraudEntityToIdentityIdentifier(
  row: FraudEntityBackfillRow
): MapFraudEntityResult {
  const entityType = row.entity_type.trim();
  const entityValue = row.entity_value;

  if (!entityValue || !entityValue.trim()) {
    return { ok: false, reason: 'skipped_invalid_value', entity_type: entityType };
  }

  if (BACKFILL_SKIPPED_LEGACY_ENTITY_TYPES.has(entityType)) {
    return { ok: false, reason: 'skipped_type', entity_type: entityType };
  }

  const identifierType =
    BACKFILL_LEGACY_ENTITY_TYPE_MAP[entityType as keyof typeof BACKFILL_LEGACY_ENTITY_TYPE_MAP];
  if (!identifierType) {
    return { ok: false, reason: 'skipped_unknown_type', entity_type: entityType };
  }

  return {
    ok: true,
    row: {
      identifier_type: identifierType,
      identifier_hash: hashIdentifier(entityValue),
      source_provider: BACKFILL_SOURCE_PROVIDER,
      raw_vs_hashed_storage: 'hashed',
      first_seen_at: row.first_seen,
      last_seen_at: row.last_seen,
    },
  };
}

export function identityIdentifierKey(row: Pick<IdentityIdentifierBackfillRow, 'identifier_type' | 'identifier_hash'>): string {
  return `${row.identifier_type}:${row.identifier_hash}`;
}

/** Merge timestamps for idempotent reruns — earliest first_seen, latest last_seen. */
export function mergeIdentityIdentifierRows(
  existing: IdentityIdentifierBackfillRow,
  incoming: IdentityIdentifierBackfillRow
): IdentityIdentifierBackfillRow {
  const firstSeenMs = Math.min(
    Date.parse(existing.first_seen_at),
    Date.parse(incoming.first_seen_at)
  );
  const lastSeenMs = Math.max(
    Date.parse(existing.last_seen_at),
    Date.parse(incoming.last_seen_at)
  );
  const preferExistingSource =
    existing.source_provider !== BACKFILL_SOURCE_PROVIDER &&
    incoming.source_provider === BACKFILL_SOURCE_PROVIDER;

  return {
    identifier_type: incoming.identifier_type,
    identifier_hash: incoming.identifier_hash,
    source_provider: preferExistingSource ? existing.source_provider : incoming.source_provider,
    raw_vs_hashed_storage: 'hashed',
    first_seen_at: new Date(firstSeenMs).toISOString(),
    last_seen_at: new Date(lastSeenMs).toISOString(),
  };
}

/** Map and dedupe a batch of legacy rows (same type+hash may not occur — defensive). */
export function mapFraudEntityBatch(
  rows: FraudEntityBackfillRow[],
  stats: BackfillRunStats
): IdentityIdentifierBackfillRow[] {
  const byKey = new Map<string, IdentityIdentifierBackfillRow>();

  for (const row of rows) {
    stats.totalScanned += 1;
    const mapped = mapFraudEntityToIdentityIdentifier(row);
    if (!mapped.ok) {
      if (mapped.reason === 'skipped_type') {
        bumpSkipType(stats, mapped.entity_type);
      } else if (mapped.reason === 'skipped_invalid_value') {
        stats.skippedInvalidValue += 1;
      } else {
        stats.skippedUnknownType += 1;
      }
      continue;
    }

    stats.mapped += 1;
    const key = identityIdentifierKey(mapped.row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? mergeIdentityIdentifierRows(prev, mapped.row) : mapped.row);
  }

  return Array.from(byKey.values());
}

/** Merge mapped batch with rows already in identity_identifiers (for upsert payload). */
export function mergeWithExistingIdentifiers(
  mapped: IdentityIdentifierBackfillRow[],
  existingRows: IdentityIdentifierBackfillRow[]
): IdentityIdentifierBackfillRow[] {
  const existingByKey = new Map(existingRows.map((row) => [identityIdentifierKey(row), row]));
  return mapped.map((row) => {
    const prev = existingByKey.get(identityIdentifierKey(row));
    return prev ? mergeIdentityIdentifierRows(prev, row) : row;
  });
}
