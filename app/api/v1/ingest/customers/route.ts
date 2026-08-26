import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateIngest, MAX_INGEST_BODY_BYTES, tooLargeResponse } from '@/lib/api/v1/ingest/auth';
import {
  claimApiIngestRequest,
  completeApiIngestRequest,
  failApiIngestRequest,
  normalizeApiIdempotencyKey,
} from '@/lib/api/v1/ingest/requestIdempotency';
import { customerIngestSchema, customerRow } from '@/lib/api/v1/ingest/entitySchemas';
import { upsertCanonicalEntity } from '@/lib/api/v1/ingest/upsertEntity';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

export const dynamic = 'force-dynamic';

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

  const parsed = customerIngestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_customer', issues: parsed.error.issues }, { status: 400 });

  const client = createServiceClient();
  const claim = await claimApiIngestRequest(client, {
    merchantId: auth.merchantId,
    resource: 'customer',
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
    const result = await upsertCanonicalEntity(
      client,
      auth.merchantId,
      { table: 'source_customers', sourceEntityType: 'customer', canonicalEntityType: 'customer', eventType: 'customer.created', conflictTarget: 'merchant_id,source,external_id' },
      { externalId: parsed.data.external_id, row: customerRow(parsed.data), idempotencyKey },
    );
    const status = result.result === 'created' ? 201 : 200;
    await completeApiIngestRequest(client, claim, { status, body: result });
    return NextResponse.json(result, { status });
  } catch (error) {
    await failApiIngestRequest(client, claim, error).catch(() => undefined);
    return NextResponse.json({ error: 'customer_ingest_failed' }, { status: 500 });
  }
}
