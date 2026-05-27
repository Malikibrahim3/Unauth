import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, updateClaimStatus } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';
import { isFinalClaimStatus } from '@/lib/claims/sla';

const reopenBodySchema = z.object({
  note: z.string().trim().min(3),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reopenBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Reopen requires a reason.' }, { status: 400 });

  const claim = loaded.claim!;
  if (!isFinalClaimStatus(claim.status)) {
    return NextResponse.json({ error: 'Only resolved or closed claims can be reopened.' }, { status: 409 });
  }

  try {
    const updated = await updateClaimStatus(serviceClient, claim, ctx.merchantId, 'under_review');
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      shop_domain: claim.shop_domain,
      event_type: 'claim_reopened',
      previous_status: claim.status,
      new_status: 'under_review',
      note: parsed.data.note,
      actor_user_id: user.id,
    });
    return NextResponse.json({ claim: { id: updated.id, status: updated.status } });
  } catch {
    return NextResponse.json({ error: 'Failed to reopen claim' }, { status: 500 });
  }
}
