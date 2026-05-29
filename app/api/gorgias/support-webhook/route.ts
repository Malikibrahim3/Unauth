import { NextRequest, NextResponse } from 'next/server';
import {
  GorgiasWebhookError,
  ingestGorgiasSupportWebhook,
} from '@/lib/support/gorgias/ingestWebhook';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Unauth Gorgias support webhook — POST events here.',
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await ingestGorgiasSupportWebhook({
      headers: request.headers,
      body,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GorgiasWebhookError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'ingest_failed' }, { status: 500 });
  }
}
