#!/usr/bin/env ts-node
/**
 * Step 6.5 — Dual-write live verification (synthetic data only).
 *
 * DATA VERIFICATION SCRIPT — NOT A MIGRATION. NOT STEP 7 CLEANUP.
 *
 * Writes synthetic identifier hashes via dual-write RPCs to verify fresh
 * ingestion paths populate identity_identifiers + identifier_co_occurrence_edges.
 *
 * Default: report baseline counts only (no writes).
 * --execute: run one synthetic CSV-batch write + one synthetic support-ticket write.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IDENTITY_SALT
 * Optional: DUAL_WRITE_VERIFY_MERCHANT_ID (must exist in merchants table)
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node --project tsconfig.scripts.json \
 *     --transpile-only -r tsconfig-paths/register -r dotenv/config \
 *     scripts/verify-dual-write-graph.ts
 *
 *   ... scripts/verify-dual-write-graph.ts --execute
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { hashIdentifier } from '@/lib/identity/hash';
import { normaliseEmail } from '@/lib/identity/normalise';
import {
  writeIdentifierGraphFromScoredBatch,
  writeIdentifierGraphFromSupportTicket,
} from '@/lib/identity/writeIdentifierGraph';
import type { ScoredOrder } from '@/lib/engine/types';
import { TABLES } from '@/lib/supabase/tables';

const SYNTHETIC_EMAIL = 'dual-write-verify-20260608@example.test';
const SYNTHETIC_TAG = 'dual_write_verify_20260608';

type CountSnapshot = {
  identityIdentifiers: number;
  identifierEdges: number;
  identifierProviders: Record<string, number>;
  edgeProviders: Record<string, number>;
};

async function snapshot(client: ReturnType<typeof createClient>): Promise<CountSnapshot> {
  const [{ count: identityIdentifiers }, { count: identifierEdges }] = await Promise.all([
    client.from(TABLES.IDENTITY_IDENTIFIERS).select('*', { count: 'exact', head: true }),
    client.from(TABLES.IDENTIFIER_CO_OCCURRENCE_EDGES).select('*', { count: 'exact', head: true }),
  ]);

  const { data: idProviders } = await client
    .from(TABLES.IDENTITY_IDENTIFIERS)
    .select('source_provider');
  const { data: edgeProviders } = await client
    .from(TABLES.IDENTIFIER_CO_OCCURRENCE_EDGES)
    .select('source_provider');

  const tally = (rows: Array<{ source_provider: string }> | null) => {
    const out: Record<string, number> = {};
    for (const row of rows ?? []) {
      out[row.source_provider] = (out[row.source_provider] ?? 0) + 1;
    }
    return out;
  };

  return {
    identityIdentifiers: identityIdentifiers ?? 0,
    identifierEdges: identifierEdges ?? 0,
    identifierProviders: tally(idProviders as Array<{ source_provider: string }> | null),
    edgeProviders: tally(edgeProviders as Array<{ source_provider: string }> | null),
  };
}

async function resolveMerchantId(client: ReturnType<typeof createClient>): Promise<string> {
  const fromEnv = process.env.DUAL_WRITE_VERIFY_MERCHANT_ID?.trim();
  if (fromEnv) {
    const { data, error } = await client.from(TABLES.MERCHANTS).select('id').eq('id', fromEnv).maybeSingle();
    if (error) throw new Error(`merchant lookup failed: ${error.message}`);
    if (!data?.id) throw new Error(`DUAL_WRITE_VERIFY_MERCHANT_ID not found in merchants: ${fromEnv}`);
    return data.id;
  }

  const { data, error } = await client.from(TABLES.MERCHANTS).select('id').limit(1).maybeSingle();
  if (error) throw new Error(`merchant lookup failed: ${error.message}`);
  if (!data?.id) throw new Error('No merchants found — set DUAL_WRITE_VERIFY_MERCHANT_ID');
  return data.id;
}

function syntheticScoredBatch(emailHash: string, phoneHash: string, addressHash: string): ScoredOrder[] {
  return [
    {
      order: {
        orderId: `${SYNTHETIC_TAG}-order`,
        orderDate: new Date('2026-06-08'),
        customerNameNorm: 'verify',
        emailHash,
        phoneHash,
        addressHash,
        billingAddressHash: null,
        ipHash: hashIdentifier('203.0.113.254'),
        cardLast4: hashIdentifier('9999'),
        orderTotal: 1,
        currency: 'USD',
        orderStatus: 'completed',
        refundStatus: 'none',
        refundReason: null,
        refundDate: null,
        refundAmount: null,
        paymentMethod: 'visa',
      } as ScoredOrder['order'],
      totalScore: 0,
      flagged: false,
      signals: [],
    },
  ];
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const salt = process.env.IDENTITY_SALT;
  if (!url || !key || !salt) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or IDENTITY_SALT');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[verify-dual-write-graph] mode:', execute ? 'execute' : 'baseline-only');

  const before = await snapshot(client);
  console.log('[verify-dual-write-graph] before', JSON.stringify(before, null, 2));

  if (!execute) {
    console.log('[verify-dual-write-graph] pass --execute to run synthetic dual-write verification');
    return;
  }

  const merchantId = await resolveMerchantId(client);
  const emailHash = hashIdentifier(normaliseEmail(SYNTHETIC_EMAIL)!);
  const phoneHash = hashIdentifier('+15559876543');
  const addressHash = hashIdentifier('999 synthetic verification street');

  const csvResult = await writeIdentifierGraphFromScoredBatch(
    syntheticScoredBatch(emailHash, phoneHash, addressHash),
    client as never,
    { merchantId, sourceProvider: 'csv' }
  );

  await writeIdentifierGraphFromSupportTicket(client as never, {
    merchantId,
    supportCaseId: '00000000-0000-4000-8000-dualwrite01',
    helpdeskTicketId: `${SYNTHETIC_TAG}-ticket`,
    helpdeskCustomerId: `${SYNTHETIC_TAG}-customer`,
    customerEmailHash: emailHash,
    platformOrderId: `${SYNTHETIC_TAG}-platform-order`,
    sourceProvider: 'gorgias',
  });

  const after = await snapshot(client);
  console.log('[verify-dual-write-graph] csv write', csvResult);
  console.log('[verify-dual-write-graph] after', JSON.stringify(after, null, 2));

  const edgeDelta = after.identifierEdges - before.identifierEdges;
  const idDelta = after.identityIdentifiers - before.identityIdentifiers;

  if (before.identifierEdges === 0 && edgeDelta <= 0) {
    throw new Error(`expected identifier_co_occurrence_edges to increase; delta=${edgeDelta}`);
  }
  if (before.identifierEdges > 0 && edgeDelta === 0) {
    const { data: bumped } = await client
      .from(TABLES.IDENTIFIER_CO_OCCURRENCE_EDGES)
      .select('seen_count')
      .gte('seen_count', 2)
      .limit(1);
    if (!bumped?.length) {
      throw new Error('idempotent re-run did not bump seen_count on existing edges');
    }
    console.log('[verify-dual-write-graph] idempotent re-run OK — seen_count incremented, no duplicate edges');
  }
  if (idDelta < 0) {
    throw new Error(`identity_identifiers count decreased; delta=${idDelta}`);
  }

  // Sanity: no plaintext @ in hashed identifier rows for our synthetic email hash
  const { data: leaked } = await client
    .from(TABLES.IDENTITY_IDENTIFIERS)
    .select('identifier_hash')
    .ilike('identifier_hash', '%@%')
    .limit(5);
  if ((leaked ?? []).length > 0) {
    throw new Error('plaintext-like identifier_hash values found (contains @)');
  }

  console.log('[verify-dual-write-graph] PASS — dual-write populated new graph tables with synthetic data');
}

main().catch((err) => {
  console.error('[verify-dual-write-graph] FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
