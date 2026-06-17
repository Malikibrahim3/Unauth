import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { recomputeEvidenceScoresForIdentities } from '@/lib/engine/evidence/recompute';
import { env } from '@/lib/utils/env';

export const maxDuration = 60;

const RECOMPUTE_WINDOW_DAYS = 365;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// Supabase caps a single select at 1000 rows; page through so we never silently
// drop active identities.
const SCAN_PAGE_SIZE = 1000;

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Distinct identity_ids with at least one linked claim in the trailing window.
 * Paginated so the result is complete regardless of claim volume.
 */
async function listRecentlyActiveIdentityIds(client: ServiceClient, cutoffIso: string): Promise<string[]> {
  const ids = new Set<string>();
  for (let from = 0; ; from += SCAN_PAGE_SIZE) {
    const { data, error } = await client
      .from(TABLES.MERCHANT_CLAIMS)
      .select('identity_id')
      .gte('submitted_at', cutoffIso)
      .not('identity_id', 'is', null)
      .range(from, from + SCAN_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`claims scan failed: ${error.message ?? String(error)}`);
    }
    const rows: Array<{ identity_id?: string | null }> = Array.isArray(data) ? data : [];
    for (const row of rows) {
      if (row.identity_id) ids.add(row.identity_id);
    }
    if (rows.length < SCAN_PAGE_SIZE) break;
  }
  return [...ids];
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const client = createServiceClient();
    const cutoffIso = new Date(Date.now() - RECOMPUTE_WINDOW_DAYS * MS_PER_DAY).toISOString();
    const identityIds = await listRecentlyActiveIdentityIds(client, cutoffIso);
    const summary = await recomputeEvidenceScoresForIdentities(identityIds, { client });
    return NextResponse.json({ window_days: RECOMPUTE_WINDOW_DAYS, scanned_identities: identityIds.length, ...summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to recompute evidence scores' },
      { status: 500 },
    );
  }
}
