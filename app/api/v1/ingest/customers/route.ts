import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateIngest, bodyTooLarge, tooLargeResponse } from '@/lib/api/v1/ingest/auth';
import { customerIngestSchema, customerRow } from '@/lib/api/v1/ingest/entitySchemas';
import { upsertCanonicalEntity } from '@/lib/api/v1/ingest/upsertEntity';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await authenticateIngest(req);
  if (auth instanceof NextResponse) return auth;

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) return NextResponse.json({ error: 'idempotency_key_required' }, { status: 400 });

  const rawBody = await req.text();
  if (bodyTooLarge(rawBody)) return tooLargeResponse();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = customerIngestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_customer', issues: parsed.error.issues }, { status: 400 });

  const client = createServiceClient();
  const result = await upsertCanonicalEntity(
    client,
    auth.merchantId,
    { table: 'source_customers', sourceEntityType: 'customer', canonicalEntityType: 'customer', eventType: 'customer.created', conflictTarget: 'merchant_id,source,external_id' },
    { externalId: parsed.data.external_id, row: customerRow(parsed.data), idempotencyKey },
  );
  return NextResponse.json(result, { status: result.result === 'created' ? 201 : 200 });
}
