import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { TABLES } from '@/lib/supabase/tables';
import { reconcileMerchant } from '@/lib/reconciliation/reconcileMerchant';

export const dynamic = 'force-dynamic';

const MERCHANT_BATCH = 100;

function authorize(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(env.CRON_SECRET && secret === env.CRON_SECRET);
}

/**
 * Scheduled reconciliation sweep. Compares Unauth records with connected sources
 * for each merchant and raises de-duplicated exceptions for drift. Idempotent: a
 * re-run over unchanged data raises zero new exceptions.
 */
async function run(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();

  const { data: merchants, error } = await admin
    .from(TABLES.MERCHANTS)
    .select('id')
    .limit(MERCHANT_BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let totalRaised = 0;
  const results: Array<{ merchantId: string; exceptionsRaised: number }> = [];
  for (const merchant of (merchants ?? []) as Array<{ id: string }>) {
    try {
      const result = await reconcileMerchant(admin, merchant.id);
      totalRaised += result.exceptionsRaised;
      if (result.exceptionsRaised > 0) results.push({ merchantId: merchant.id, exceptionsRaised: result.exceptionsRaised });
    } catch (cause) {
      console.error('[reconcile] merchant sweep failed', { merchantId: merchant.id, message: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return NextResponse.json({ merchantsSwept: merchants?.length ?? 0, exceptionsRaised: totalRaised, results });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
