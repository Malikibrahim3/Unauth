import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { scanPendingInvestigationAttachments } from '@/lib/investigations/attachments';
import { env } from '@/lib/utils/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (
    !env.CRON_SECRET
    || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.INVESTIGATION_MALWARE_SCAN_URL || !env.INVESTIGATION_MALWARE_SCAN_TOKEN) {
    return NextResponse.json(
      {
        error: 'Investigation malware scanner is not configured.',
        scanned: 0,
      },
      { status: 503 },
    );
  }
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get('limit')) || 20, 1),
    100,
  );
  const result = await scanPendingInvestigationAttachments(
    createServiceClient(),
    { limit },
  );
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
