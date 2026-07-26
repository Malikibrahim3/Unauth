import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateIngest } from '@/lib/api/v1/ingest/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';

const eventIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const auth = await authenticateIngest(request);
  if (auth instanceof NextResponse) return auth;
  const { eventId } = await params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  }
  const { data, error } = await createServiceClient()
    .from(TABLES.INGESTION_EVENTS)
    .select('id,status,attempts,max_attempts,received_at,updated_at,next_attempt_at,payload_purged_at')
    .eq('merchant_id', auth.merchantId)
    .eq('id', eventId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  }
  return NextResponse.json(
    {
      ingestion_event_id: data.id,
      status: data.status,
      attempts: data.attempts,
      max_attempts: data.max_attempts,
      received_at: data.received_at,
      updated_at: data.updated_at,
      next_attempt_at: ['pending', 'failed'].includes(data.status)
        ? data.next_attempt_at
        : null,
      payload_retained: data.payload_purged_at == null,
      terminal: ['normalized', 'dead_letter', 'ignored'].includes(data.status),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
