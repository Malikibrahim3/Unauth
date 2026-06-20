import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createEvidenceItemSchema, upsertClaimEvidenceItem } from '@/lib/claims/store';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const claim = loaded.claim!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createEvidenceItemSchema.safeParse({ ...body as object, claim_id: claimId });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid evidence payload' }, { status: 400 });

  try {
    const evidence = await upsertClaimEvidenceItem(serviceClient, {
      ...parsed.data,
      merchant_id: ctx.merchantId,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: 'evidence_added',
      actor_user_id: user.id,
      metadata: {
        evidence_id: evidence.id,
        evidence_type: evidence.evidence_type,
        source: parsed.data.source,
      },
    });
    return NextResponse.json({ evidence: { id: evidence.id, claim_id: evidence.claim_id, evidence_type: evidence.evidence_type, source: parsed.data.source } });
  } catch {
    return NextResponse.json({ error: 'Failed to add evidence' }, { status: 500 });
  }
}
