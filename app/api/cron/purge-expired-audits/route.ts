import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/utils/env';

export const maxDuration = 60;

/**
 * CSV/public audits were retired at the v2 cutover. Keep the authenticated cron
 * endpoint as a safe no-op until its deployment schedule and external monitors
 * have been removed.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  return NextResponse.json({ deleted: 0, retired: true });
}

export const GET = POST;
