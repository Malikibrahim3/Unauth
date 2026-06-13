import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, updateClaimSnooze } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

const snoozeSchema = z.object({
  snoozed_until: z.string().datetime().nullable(),
  reason: z.string().trim().max(500).nullable().optional(),
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

  const body = await request.json().catch(() => ({}));
  const parsed = snoozeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid snooze payload' }, { status: 400 });

  const claim = loaded.claim!;
  try {
    const updated = await updateClaimSnooze(
      serviceClient,
      claim,
      ctx.merchantId,
      parsed.data.snoozed_until,
      parsed.data.snoozed_until ? parsed.data.reason ?? null : null,
    );
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: parsed.data.snoozed_until ? 'claim_snoozed' : 'claim_unsnoozed',
      previous_status: claim.status,
      new_status: updated.status ?? claim.status,
      note: parsed.data.reason ?? null,
      actor_user_id: user.id,
      metadata: { snoozed_until: parsed.data.snoozed_until },
    });
    return NextResponse.json({
      claim: {
        id: claimId,
        status: updated.status ?? claim.status,
        snoozed_until: updated.snoozed_until ?? null,
        snooze_reason: updated.snooze_reason ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update snooze' }, { status: 500 });
  }
}
