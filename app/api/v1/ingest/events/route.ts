import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateIngest, MAX_INGEST_BODY_BYTES, tooLargeResponse } from '@/lib/api/v1/ingest/auth';
import { validateEventEnvelope } from '@/lib/api/v1/ingest/eventSchema';
import { acceptEvent } from '@/lib/api/v1/ingest/acceptEvent';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

export const dynamic = 'force-dynamic';

/**
 * Canonical webhook intake. Authenticates via merchant API key (merchant derived
 * from the credential, never the body), validates the event envelope + per-type
 * data, and enqueues to the ingestion inbox. Returns 202 (accepted/duplicate) or
 * 409 (idempotency_payload_conflict). Never runs case/rule logic synchronously.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateIngest(req);
  if (auth instanceof NextResponse) return auth;

  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(req, MAX_INGEST_BODY_BYTES);
  } catch (error) {
    if (error instanceof WebhookBodyError && error.status === 413) return tooLargeResponse();
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const validation = validateEventEnvelope(parsed);
  if (!validation.ok) {
    return NextResponse.json({ error: 'invalid_event', issues: validation.errors }, { status: 400 });
  }

  const client = createServiceClient();
  const result = await acceptEvent(client, auth.merchantId, validation.envelope);
  return NextResponse.json(result.body, { status: result.status });
}
