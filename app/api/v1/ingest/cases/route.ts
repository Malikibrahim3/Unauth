import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateIngest, bodyTooLarge, tooLargeResponse } from '@/lib/api/v1/ingest/auth';
import { createManualCase, manualCaseSchema } from '@/lib/cases/createManualCase';

export const dynamic = 'force-dynamic';

/**
 * Canonical case ingest (API-key authenticated). Reuses the manual-case service:
 * a case may arrive with an order reference (resolved confirmed/ambiguous/none)
 * or as a fully unanchored manual case.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateIngest(req);
  if (auth instanceof NextResponse) return auth;

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) return NextResponse.json({ error: 'idempotency_key_required' }, { status: 400 });

  const rawBody = await req.text();
  if (bodyTooLarge(rawBody)) return tooLargeResponse();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = manualCaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_case', issues: parsed.error.issues }, { status: 400 });

  const client = createServiceClient();
  const result = await createManualCase(client, auth.merchantId, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
