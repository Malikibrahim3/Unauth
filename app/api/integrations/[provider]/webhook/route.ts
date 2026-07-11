import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { mapAfterShipTrackingToEvidence } from '@/lib/integrations/evidenceMapper';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { requireIntegrationProvider } from '@/lib/integrations/registry';

// AfterShip webhooks are authenticated with an HMAC signature over the raw body.
function validAfterShipSignature(rawBody: string, secret: string, received: string | null): boolean {
  if (!received) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = requireIntegrationProvider(providerId);
  if (provider.id !== 'aftership') {
    return NextResponse.json({ error: 'Webhook is not supported for this provider yet.' }, { status: 400 });
  }
  const merchantId = request.nextUrl.searchParams.get('merchantId');
  if (!merchantId) return NextResponse.json({ error: 'merchantId is required.' }, { status: 400 });

  const serviceClient = createServiceClient();
  const credentials = await getIntegrationCredential(serviceClient, merchantId, provider.id);
  const webhookSecret = typeof credentials?.webhookSecret === 'string' ? credentials.webhookSecret : null;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret is not configured for this merchant.' }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!validAfterShipSignature(rawBody, webhookSecret, request.headers.get('aftership-hmac-sha256'))) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const tracking = body?.data?.tracking ?? body?.tracking ?? body;
  const items = mapAfterShipTrackingToEvidence(tracking, { merchantId });
  try {
    await writeCanonicalEvidence(serviceClient, items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'canonical_evidence_write_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, evidence_items: items.length });
}
