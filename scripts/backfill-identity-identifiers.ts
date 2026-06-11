#!/usr/bin/env ts-node
/**
 * Phase 2 Step 6 — Backfill identity_identifiers from fraud_entities (registry only).
 *
 * DATA SCRIPT — NOT A MIGRATION.
 * Do not run via supabase db push, MCP apply_migration, or SQL migrations.
 *
 * Scope (Option B — locked):
 *   fraud_entities → identity_identifiers ONLY
 *
 * Explicitly does NOT:
 *   - modify or delete fraud_entities
 *   - modify or delete fraud_entity_co_occurrences
 *   - backfill identifier_co_occurrence_edges
 *   - infer merchant IDs or create merchant-scoped edges
 *   - change fastContext.ts, dual-read, or dual-write
 *
 * Usage:
 *   # Dry-run (default) — scan + map + log counts, no writes
 *   npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register scripts/backfill-identity-identifiers.ts
 *
 *   # Execute writes (requires explicit flag)
 *   npx ts-node --project tsconfig.scripts.json --transpile-only -r tsconfig-paths/register scripts/backfill-identity-identifiers.ts --execute
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IDENTITY_SALT
 *
 * Server-only script. Uses SUPABASE_SERVICE_ROLE_KEY via @supabase/supabase-js
 * createClient — never anon/authenticated. Do not import from browser/client bundles.
 *
 * source_provider note: backfill rows use `manual` because `legacy_backfill` is not
 * allowed by identity_identifiers.source_provider CHECK. These are not manually
 * entered identifiers. Do not alter the CHECK constraint for this backfill.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { TABLES } from '../lib/supabase/tables';
import {
  createEmptyBackfillStats,
  mapFraudEntityBatch,
  mergeWithExistingIdentifiers,
  identityIdentifierKey,
  type FraudEntityBackfillRow,
  type IdentityIdentifierBackfillRow,
  type BackfillRunStats,
} from '../lib/identity/backfillFraudEntities';

const DEFAULT_BATCH_SIZE = 200;
const FRAUD_ENTITY_SELECT = 'id,entity_type,entity_value,first_seen,last_seen';
const IDENTITY_SELECT =
  'identifier_type,identifier_hash,source_provider,raw_vs_hashed_storage,first_seen_at,last_seen_at';

function parseArgs(argv: string[]): { execute: boolean; batchSize: number } {
  const execute = argv.includes('--execute');
  const batchArg = argv.find((a) => a.startsWith('--batch-size='));
  const batchSize = batchArg ? Number(batchArg.split('=')[1]) : DEFAULT_BATCH_SIZE;
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }
  return { execute, batchSize };
}

function logProgress(message: string, extra?: Record<string, unknown>): void {
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[backfill-identity-identifiers] ${message}${payload}`);
}

async function fetchExistingIdentifiers(
  supabase: ReturnType<typeof createClient>,
  rows: IdentityIdentifierBackfillRow[]
): Promise<IdentityIdentifierBackfillRow[]> {
  if (rows.length === 0) return [];

  const emailHashes = rows
    .filter((r) => r.identifier_type === 'normalized_email_hash')
    .map((r) => r.identifier_hash);
  const addressHashes = rows
    .filter((r) => r.identifier_type === 'full_normalized_shipping_address_hash')
    .map((r) => r.identifier_hash);

  const fetches: Promise<{ data: IdentityIdentifierBackfillRow[] | null; error: { message: string } | null }>[] = [];

  if (emailHashes.length > 0) {
    fetches.push(
      supabase
        .from(TABLES.IDENTITY_IDENTIFIERS)
        .select(IDENTITY_SELECT)
        .eq('identifier_type', 'normalized_email_hash')
        .in('identifier_hash', emailHashes) as Promise<{
        data: IdentityIdentifierBackfillRow[] | null;
        error: { message: string } | null;
      }>
    );
  }
  if (addressHashes.length > 0) {
    fetches.push(
      supabase
        .from(TABLES.IDENTITY_IDENTIFIERS)
        .select(IDENTITY_SELECT)
        .eq('identifier_type', 'full_normalized_shipping_address_hash')
        .in('identifier_hash', addressHashes) as Promise<{
        data: IdentityIdentifierBackfillRow[] | null;
        error: { message: string } | null;
      }>
    );
  }

  const results = await Promise.all(fetches);
  const out: IdentityIdentifierBackfillRow[] = [];
  for (const result of results) {
    if (result.error) {
      throw new Error(`fetch existing identity_identifiers failed: ${result.error.message}`);
    }
    out.push(...(result.data ?? []));
  }
  return out;
}

async function upsertIdentifierBatch(
  supabase: ReturnType<typeof createClient>,
  rows: IdentityIdentifierBackfillRow[],
  stats: BackfillRunStats
): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase.from(TABLES.IDENTITY_IDENTIFIERS).upsert(rows, {
    onConflict: 'identifier_type,identifier_hash',
    ignoreDuplicates: false,
  });

  if (error) {
    stats.errors += rows.length;
    throw new Error(`upsert identity_identifiers failed: ${error.message}`);
  }
  stats.insertedOrUpserted += rows.length;
}

async function main(): Promise<void> {
  const { execute, batchSize } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.IDENTITY_SALT;
  if (!url || !key || !salt) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or IDENTITY_SALT');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats = createEmptyBackfillStats();
  let offset = 0;
  let proposedUpserts = 0;

  logProgress('starting', { execute, batchSize, mode: execute ? 'execute' : 'dry-run' });

  while (true) {
    // fraud_entities has no created_at — deterministic order: first_seen, then id.
    const { data, error } = await supabase
      .from('fraud_entities')
      .select(FRAUD_ENTITY_SELECT)
      .order('first_seen', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`read fraud_entities failed: ${error.message}`);
    }

    const batch = (data ?? []) as FraudEntityBackfillRow[];
    if (batch.length === 0) break;

    const mapped = mapFraudEntityBatch(batch, stats);
    proposedUpserts += mapped.length;

    if (mapped.length > 0 && execute) {
      const existing = await fetchExistingIdentifiers(supabase, mapped);
      const merged = mergeWithExistingIdentifiers(mapped, existing);
      await upsertIdentifierBatch(supabase, merged, stats);
    } else if (mapped.length > 0) {
      logProgress('dry-run batch mapped', {
        offset,
        batchRows: batch.length,
        mappedRows: mapped.length,
        sampleKeys: mapped.slice(0, 3).map(identityIdentifierKey),
      });
    }

    offset += batch.length;
    logProgress('batch complete', { offset, mappedThisBatch: mapped.length });

    if (batch.length < batchSize) break;
  }

  logProgress('finished', {
    ...stats,
    proposedUpserts,
    insertedOrUpserted: execute ? stats.insertedOrUpserted : 0,
  });

  if (!execute) {
    logProgress('dry-run only — pass --execute to write identity_identifiers');
  }
}

main().catch((err) => {
  console.error('[backfill-identity-identifiers] fatal', err instanceof Error ? err.message : err);
  process.exit(1);
});
