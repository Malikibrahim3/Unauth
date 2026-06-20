import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant, updateClaimAssignment } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

const assignmentSchema = z.object({
  action: z.enum(['assign_to_me', 'unassign']),
});

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

  const body = await request.json().catch(() => ({}));
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid assignment action' }, { status: 400 });

  const claim = loaded.claim!;
  const assignedTo = parsed.data.action === 'assign_to_me' ? user.id : null;
  try {
    const updated = await updateClaimAssignment(serviceClient, claim, ctx.merchantId, assignedTo);
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: assignedTo ? 'claim_assigned' : 'claim_unassigned',
      actor_user_id: user.id,
      metadata: {
        previous_assigned_to: claim.assigned_to ?? null,
        assigned_to: assignedTo,
      },
    });
    return NextResponse.json({ claim: { id: claimId, assigned_to: updated.assigned_to ?? null, assigned_at: updated.assigned_at ?? null } });
  } catch {
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}
