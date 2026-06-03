import { NextRequest, NextResponse } from 'next/server';
import {
  processExpiredGracePeriods,
  sendGracePeriodReminders,
} from '@/lib/billing/stripeWebhooks';
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';

export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(env.CRON_SECRET && secret === env.CRON_SECRET);
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const expired = await processExpiredGracePeriods(supabase);
  const reminders = await sendGracePeriodReminders(supabase);

  return NextResponse.json({ expired, reminders });
}
