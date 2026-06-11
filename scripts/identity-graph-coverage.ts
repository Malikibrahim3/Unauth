#!/usr/bin/env ts-node
/**
 * Step 6.6 — Identity graph coverage observability (read-only).
 *
 * Prints coverage stats and Step 7 readiness checklist from
 * get_identity_graph_coverage() RPC (service_role only).
 *
 * No writes. No legacy cleanup. No dual-write changes.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx ts-node --project tsconfig.scripts.json \
 *     --transpile-only -r tsconfig-paths/register -r dotenv/config \
 *     scripts/identity-graph-coverage.ts
 *
 *   ... --json   # machine-readable output
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  assessStep7Readiness,
  fetchIdentityGraphCoverage,
  formatIdentityGraphCoverageReport,
} from '@/lib/identity/identityGraphCoverage';

async function main(): Promise<void> {
  const asJson = process.argv.includes('--json');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const snapshot = await fetchIdentityGraphCoverage(client as never);
  const readiness = assessStep7Readiness(snapshot);

  if (asJson) {
    console.log(JSON.stringify({ snapshot, readiness }, null, 2));
    return;
  }

  console.log(formatIdentityGraphCoverageReport(snapshot, readiness));
}

main().catch((err) => {
  console.error('[identity-graph-coverage] FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
