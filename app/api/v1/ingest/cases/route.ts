import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateIngest, MAX_INGEST_BODY_BYTES, tooLargeResponse } from '@/lib/api/v1/ingest/auth';
import {
  claimApiIngestRequest,
  completeApiIngestRequest,
  failApiIngestRequest,
  normalizeApiIdempotencyKey,
} from '@/lib/api/v1/ingest/requestIdempotency';
import { createManualCase, manualCaseSchema } from '@/lib/cases/createManualCase';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

export const dynamic = 'force-dynamic';

/**
 * Canonical case ingest (API-key authenticated). Reuses the manual-case service:
 * a case may arrive with an order reference (resolved confirmed/ambiguous/none)
 * or as a fully unanchored manual case.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateIngest(req, 'imports:write');
  if (auth instanceof NextResponse) return auth;

  const rawIdempotencyKey = req.headers.get('idempotency-key');
  if (!rawIdempotencyKey) return NextResponse.json({ error: 'idempotency_key_required' }, { status: 400 });
  const idempotencyKey = normalizeApiIdempotencyKey(rawIdempotencyKey);
  if (!idempotencyKey) return NextResponse.json({ error: 'invalid_idempotency_key' }, { status: 400 });

  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(req, MAX_INGEST_BODY_BYTES);
  } catch (error) {
    if (error instanceof WebhookBodyError && error.status === 413) return tooLargeResponse();
    if (error instanceof WebhookBodyError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = manualCaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_case', issues: parsed.error.issues }, { status: 400 });

  const client = createServiceClient();
  const claim = await claimApiIngestRequest(client, {
    merchantId: auth.merchantId,
    resource: 'case',
    idempotencyKey,
    rawBody,
  });
  if (claim.state === 'response') {
    return NextResponse.json(claim.body, {
      status: claim.status,
      headers: claim.retryAfterSeconds ? { 'Retry-After': String(claim.retryAfterSeconds) } : undefined,
    });
  }

  try {
    const result = await createManualCase(client, auth.merchantId, parsed.data, {
      apiIdempotencyKey: idempotencyKey,
      rawBody,
    });
    await completeApiIngestRequest(client, claim, { status: 201, body: result });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    await failApiIngestRequest(client, claim, error).catch(() => undefined);
    return NextResponse.json({ error: 'case_ingest_failed' }, { status: 500 });
  }
}
