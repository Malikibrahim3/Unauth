import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  SUPPORT_INGEST_SECRET_HEADER,
  verifySupportIngestSecret,
} from '@/lib/support/intake/ingestAuth';
import {
  ingestSupportCase,
  SupportIngestError,
  supportIngestBodySchema,
} from '@/lib/support/intake/ingestSupportCase';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';

export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'support-ingest', getClientIp(request.headers)),
    limitFromEnv('SUPPORT_INGEST_RATE_LIMIT', 1000, 60)
  );
  if (limited) return limited;

  const secret = request.headers.get(SUPPORT_INGEST_SECRET_HEADER);
  if (!verifySupportIngestSecret(secret)) {
    return unauthorized();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest('invalid_json');
  }

  const parsed = supportIngestBodySchema.safeParse(json);
  if (!parsed.success) {
    return badRequest('invalid_request');
  }

  try {
    const supabase = createServiceClient();
    const result = await ingestSupportCase(supabase, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SupportIngestError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
