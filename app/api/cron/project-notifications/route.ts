import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { TABLES } from '@/lib/supabase/tables';
import { projectOperationalNotifications } from '@/lib/notifications/projectOperational';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function run(request: NextRequest) {
  if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const merchantId = request.nextUrl.searchParams.get('merchantId');
  let query = service.from(TABLES.MERCHANTS).select('id').order('id').limit(100);
  if (merchantId) query = query.eq('id', merchantId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results = [];
  for (const merchant of data ?? []) results.push({ merchantId: merchant.id, ...(await projectOperationalNotifications(service, merchant.id)) });
  return NextResponse.json({ merchants: results.length, results });
}

export const GET = run;
export const POST = run;
