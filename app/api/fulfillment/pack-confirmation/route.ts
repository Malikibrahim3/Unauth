import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyPackConfirmationSignature } from '@/lib/fulfillment/packConfirmation';
import { mapSelfFulfillmentPackConfirmationToEvidence } from '@/lib/integrations/evidenceMapper';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { readBoundedRequestBytes, WebhookBodyError } from '@/lib/webhooks/body';

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Public endpoint guarded by an HMAC-signed, expiring, single-use link.
const querySchema = z.object({
  merchantId: z.string().uuid(),
  orderId: z.string().min(1).max(128),
  fulfillmentId: z.string().min(1).max(128),
  expiresAt: z.string().datetime(),
  token: z.string().min(16),
});

type ParsedBody = {
  confirmedBy: string | null;
  itemMatchConfirmed: boolean;
  photo: { bytes: Uint8Array; contentType: string; extension: string } | null;
};

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function detectedImage(bytes: Uint8Array): { contentType: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  return null;
}

async function readBody(request: NextRequest): Promise<{ bytes: Uint8Array; parsed: ParsedBody }> {
  const bytes = await readBoundedRequestBytes(request, MAX_BODY_BYTES);
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      const boundedRequest = new Request(request.url, {
        method: 'POST',
        headers: { 'content-type': request.headers.get('content-type') ?? '' },
        body: Buffer.from(bytes),
      });
      formData = await boundedRequest.formData();
    } catch {
      throw new WebhookBodyError(400, 'invalid_body');
    }

    const rawPhoto = formData.get('photo');
    let photo: ParsedBody['photo'] = null;
    if (rawPhoto instanceof File && rawPhoto.size > 0) {
      if (rawPhoto.size > MAX_PHOTO_BYTES) throw new WebhookBodyError(413, 'payload_too_large');
      const photoBytes = new Uint8Array(await rawPhoto.arrayBuffer());
      const detected = detectedImage(photoBytes);
      if (!detected || (rawPhoto.type && rawPhoto.type.toLowerCase() !== detected.contentType)) {
        throw new WebhookBodyError(400, 'invalid_body');
      }
      photo = { bytes: photoBytes, ...detected };
    }

    return {
      bytes,
      parsed: {
        confirmedBy: boundedText(formData.get('confirmed_by'), 200),
        itemMatchConfirmed: ['true', '1', 'on', 'yes'].includes(
          String(formData.get('item_match_confirmed') ?? '').toLowerCase(),
        ),
        photo,
      },
    };
  }

  if (!contentType.includes('application/json')) throw new WebhookBodyError(400, 'invalid_body');
  let body: Record<string, unknown>;
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const value = JSON.parse(decoded);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json');
    body = value as Record<string, unknown>;
  } catch {
    throw new WebhookBodyError(400, 'invalid_body');
  }
  return {
    bytes,
    parsed: {
      confirmedBy: boundedText(body.confirmed_by, 200),
      itemMatchConfirmed: body.item_match_confirmed === true,
      photo: null,
    },
  };
}

function storedResponse(value: unknown): { status: number; body: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.status) || !Object.prototype.hasOwnProperty.call(record, 'body')) return null;
  return { status: Number(record.status), body: record.body };
}

function confirmationResponse(confirmation: Record<string, unknown>, evidenceCount: number) {
  return {
    ok: true,
    confirmation: {
      id: confirmation.id,
      item_match_confirmed: confirmation.item_match_confirmed,
      photo_attached: Boolean(confirmation.photo_url),
      confirmed_at: confirmation.confirmed_at,
    },
    evidence_items: evidenceCount,
  };
}

export async function POST(request: NextRequest) {
  const query = querySchema.safeParse({
    merchantId: request.nextUrl.searchParams.get('merchantId'),
    orderId: request.nextUrl.searchParams.get('orderId'),
    fulfillmentId: request.nextUrl.searchParams.get('fulfillmentId'),
    expiresAt: request.nextUrl.searchParams.get('expiresAt'),
    token: request.nextUrl.searchParams.get('token'),
  });
  if (!query.success) return NextResponse.json({ error: 'Invalid confirmation link.' }, { status: 400 });

  if (Date.parse(query.data.expiresAt) < Date.now()) {
    return NextResponse.json({ error: 'Confirmation link has expired.' }, { status: 410 });
  }
  if (!verifyPackConfirmationSignature(query.data)) {
    return NextResponse.json({ error: 'Invalid confirmation signature.' }, { status: 401 });
  }

  let bounded: Awaited<ReturnType<typeof readBody>>;
  try {
    bounded = await readBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }

  const serviceClient = createServiceClient();
  const objectReference = createHash('sha256')
    .update(`${query.data.orderId}\u001f${query.data.fulfillmentId}`)
    .digest('hex');
  const claim = await claimProcessedWebhook(serviceClient, {
    platform: 'self-fulfillment',
    storeKey: query.data.merchantId,
    nativeWebhookId: objectReference,
    topic: 'pack.confirmed',
    rawBody: bounded.bytes,
  });

  if (claim.status === 'duplicate') {
    const replay = storedResponse(claim.result);
    return replay
      ? NextResponse.json(replay.body, { status: replay.status })
      : NextResponse.json({ ok: true, duplicate: true });
  }
  if (claim.status === 'conflict') {
    return NextResponse.json({ error: 'Confirmation link has already been used with different data.' }, { status: 409 });
  }
  if (claim.retry) {
    return NextResponse.json({ error: 'Confirmation is already being processed.' }, {
      status: 503,
      headers: { 'Retry-After': '2' },
    });
  }
  if (claim.status === 'stale') {
    return NextResponse.json({ error: 'Stale confirmation.' }, { status: 409 });
  }

  try {
    const existing = await serviceClient
      .from(TABLES.PACK_CONFIRMATIONS)
      .select('*')
      .eq('merchant_id', query.data.merchantId)
      .eq('order_id', query.data.orderId)
      .eq('fulfillment_id', query.data.fulfillmentId)
      .maybeSingle();
    if (existing.error) throw new Error(`pack_confirmation_lookup_failed: ${existing.error.message}`);

    let confirmation = existing.data as Record<string, unknown> | null;
    if (!confirmation) {
      let photoUrl: string | null = null;
      if (bounded.parsed.photo) {
        const photoHash = createHash('sha256').update(bounded.parsed.photo.bytes).digest('hex');
        const orderPath = createHash('sha256').update(query.data.orderId).digest('hex').slice(0, 20);
        const fulfillmentPath = createHash('sha256').update(query.data.fulfillmentId).digest('hex').slice(0, 20);
        photoUrl = `${query.data.merchantId}/${orderPath}/${fulfillmentPath}-${photoHash}.${bounded.parsed.photo.extension}`;
        const { error: uploadError } = await serviceClient.storage
          .from(STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS)
          .upload(photoUrl, Buffer.from(bounded.parsed.photo.bytes), {
            contentType: bounded.parsed.photo.contentType,
            upsert: true,
          });
        if (uploadError) throw new Error(`pack_confirmation_photo_upload_failed: ${uploadError.message}`);
      }

      const confirmedAt = new Date().toISOString();
      const { data, error: insertError } = await serviceClient
        .from(TABLES.PACK_CONFIRMATIONS)
        .insert({
          merchant_id: query.data.merchantId,
          order_id: query.data.orderId,
          fulfillment_id: query.data.fulfillmentId,
          confirmed_by: bounded.parsed.confirmedBy,
          item_match_confirmed: bounded.parsed.itemMatchConfirmed,
          photo_url: photoUrl,
          confirmed_at: confirmedAt,
        })
        .select('*')
        .single();
      if (insertError) throw new Error(`pack_confirmation_insert_failed: ${insertError.message}`);
      confirmation = data as Record<string, unknown>;
    }

    const evidence = mapSelfFulfillmentPackConfirmationToEvidence(confirmation, {
      merchantId: query.data.merchantId,
      now: String(confirmation.confirmed_at ?? new Date().toISOString()),
    });
    await writeCanonicalEvidence(serviceClient, evidence);

    const responseBody = confirmationResponse(confirmation, evidence.length);
    await completeProcessedWebhook(
      serviceClient,
      claim.idempotencyKey,
      claim.claimToken,
      'completed',
      null,
      { status: 200, body: responseBody },
    );
    return NextResponse.json(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'pack_confirmation_failed';
    await completeProcessedWebhook(
      serviceClient,
      claim.idempotencyKey,
      claim.claimToken,
      'failed',
      message,
    ).catch(() => undefined);
    return NextResponse.json({ error: 'pack_confirmation_failed' }, { status: 500 });
  }
}
