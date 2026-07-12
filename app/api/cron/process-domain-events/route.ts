import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { runDomainEventHandlers } from '@/lib/events/handlers/registry';

export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(env.CRON_SECRET && secret === env.CRON_SECRET);
}

async function run(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = await runDomainEventHandlers(createAdminClient(), { limitPerHandler: 20 });
  const processed = Object.values(results).reduce((total, result) => total + result.processed, 0);
  const failed = Object.values(results).reduce((total, result) => total + result.failed, 0);
  return NextResponse.json({ processed, failed, results });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
