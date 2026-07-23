import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/utils/env';
import { createServiceClient } from '@/lib/supabase/server';
import { processPrivacyStorageCleanup } from '@/lib/privacy/storageCleanup';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: rawIngestion, error } = await service.rpc(
    'purge_expired_ingestion_payloads',
    { p_limit: 1000 },
  );
  if (error) {
    return NextResponse.json(
      { error: 'Retention maintenance failed.' },
      { status: 500 },
    );
  }

  try {
    const privacyStorage = await processPrivacyStorageCleanup(service, { limit: 100 });
    return NextResponse.json({ rawIngestion, privacyStorage });
  } catch {
    // Raw-payload retention already committed. A non-2xx response lets the
    // scheduler retry the leased Storage queue without concealing the failure.
    return NextResponse.json(
      { rawIngestion, error: 'Privacy storage cleanup remains queued.' },
      { status: 503 },
    );
  }
}

export const GET = POST;
