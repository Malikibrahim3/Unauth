import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  verifyPackConfirmationSignature,
} from '@/lib/fulfillment/packConfirmation';
import { mapSelfFulfillmentPackConfirmationToEvidence } from '@/lib/integrations/evidenceMapper';
import { writeCanonicalEvidence } from '@/lib/integrations/canonicalEvidence';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';

// Public endpoint guarded by an HMAC-signed, expiring, single-use link.
const querySchema = z.object({
  merchantId: z.string().uuid(),
  orderId: z.string().min(1).max(128),
  fulfillmentId: z.string().min(1).max(128),
  expiresAt: z.string().datetime(),
  token: z.string().min(16),
});

function safeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'photo';
}

async function readBody(request: NextRequest): Promise<{
  confirmedBy: string | null;
  itemMatchConfirmed: boolean;
  photo: File | null;
}> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const rawPhoto = formData.get('photo');
    return {
      confirmedBy: String(formData.get('confirmed_by') ?? '').trim() || null,
      itemMatchConfirmed: ['true', '1', 'on', 'yes'].includes(String(formData.get('item_match_confirmed') ?? '').toLowerCase()),
      photo: rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null,
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    confirmedBy: typeof body.confirmed_by === 'string' && body.confirmed_by.trim()
      ? body.confirmed_by.trim()
      : null,
    itemMatchConfirmed: body.item_match_confirmed === true,
    photo: null,
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

  const serviceClient = createServiceClient();
  const existing = await serviceClient
    .from(TABLES.PACK_CONFIRMATIONS)
    .select('id')
    .eq('merchant_id', query.data.merchantId)
    .eq('order_id', query.data.orderId)
    .eq('fulfillment_id', query.data.fulfillmentId)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (existing.data?.id) return NextResponse.json({ error: 'Confirmation link has already been used.' }, { status: 409 });

  const body = await readBody(request);
  let photoUrl: string | null = null;
  if (body.photo) {
    const bytes = Buffer.from(await body.photo.arrayBuffer());
    const path = `${query.data.merchantId}/${query.data.orderId}/${randomUUID()}-${safeFileName(body.photo.name)}`;
    const { error: uploadError } = await serviceClient.storage
      .from(STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS)
      .upload(path, bytes, {
        contentType: body.photo.type || 'application/octet-stream',
        upsert: false,
      });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    photoUrl = path;
  }

  const confirmedAt = new Date().toISOString();
  const { data: confirmation, error: insertError } = await serviceClient
    .from(TABLES.PACK_CONFIRMATIONS)
    .insert({
      merchant_id: query.data.merchantId,
      order_id: query.data.orderId,
      fulfillment_id: query.data.fulfillmentId,
      confirmed_by: body.confirmedBy,
      item_match_confirmed: body.itemMatchConfirmed,
      photo_url: photoUrl,
      confirmed_at: confirmedAt,
    })
    .select('*')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const evidence = mapSelfFulfillmentPackConfirmationToEvidence(confirmation, {
    merchantId: query.data.merchantId,
    now: confirmedAt,
  });
  try {
    await writeCanonicalEvidence(serviceClient, evidence);
  } catch (evidenceError) {
    const message = evidenceError instanceof Error ? evidenceError.message : 'canonical_evidence_write_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    confirmation: {
      id: confirmation.id,
      item_match_confirmed: confirmation.item_match_confirmed,
      photo_attached: Boolean(confirmation.photo_url),
      confirmed_at: confirmation.confirmed_at,
    },
    evidence_items: evidence.length,
  });
}
