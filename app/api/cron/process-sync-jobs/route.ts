import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { runDueSyncJobs } from '@/lib/connectors/syncWorker';

export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(env.CRON_SECRET && secret === env.CRON_SECRET);
}

async function run(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createAdminClient();
  const results = await runDueSyncJobs(supabase, { limit: 10 });
  return NextResponse.json({ processed: results.length, results });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
