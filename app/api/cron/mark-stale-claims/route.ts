import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { flagAgedPendingClaims } from '@/lib/claims/stale';
import { env } from '@/lib/utils/env';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const result = await flagAgedPendingClaims(createServiceClient());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to flag aged pending cases' },
      { status: 500 }
    );
  }
}

// Vercel Cron invokes scheduled jobs with GET (Authorization: Bearer CRON_SECRET).
export const GET = POST;
