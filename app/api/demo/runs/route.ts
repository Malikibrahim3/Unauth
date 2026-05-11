/**
 * app/api/demo/runs/route.ts
 *
 * Tightly-scoped internal helper for the public /demo page.
 *
 * SECURITY:
 * - Only exposes whitelisted fields: id, filename, total_rows, flagged_count,
 *   status, created_at — no PII, no customer data.
 * - Hard-scoped to NEXT_PUBLIC_DEMO_MERCHANT_ID only.
 * - Returns empty array if DEMO_MERCHANT_ID is not configured.
 * - Uses service role on the server-side only (this is a route handler, not
 *   a public page), and ONLY reads from processing_jobs for the demo merchant.
 * - Validates the x-internal-demo header to prevent unintended public exposure.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedClient } from '@/lib/supabase/scoped';
import { createRequestLogger, withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Whitelisted fields — no PII
const DEMO_FIELDS = 'id, filename, total_rows, flagged_count, status, created_at';

async function GETHandler(req: NextRequest) {
  const logger = createRequestLogger(req, '/api/demo/runs');
  // Only callable from server-side demo page fetch
  if (req.headers.get('x-internal-demo') !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const DEMO_MERCHANT_ID = process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID;
  if (!DEMO_MERCHANT_ID) {
    return NextResponse.json({ runs: [] });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ runs: [] });
  }

  const supabase = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const scopedSupabase = createScopedClient(DEMO_MERCHANT_ID, supabase as any);

  const { data, error } = await scopedSupabase
    .from('processing_jobs')
    .select(DEMO_FIELDS)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    logger.error('demo.runs.query_failed', { error });
    return NextResponse.json({ runs: [] });
  }

  return NextResponse.json({ runs: data ?? [] });
}

export const GET = withRequestLogging('/api/demo/runs', GETHandler);
