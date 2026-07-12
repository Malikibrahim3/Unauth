import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

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
    const updated = await transitionCase(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      patch: {},
      attributes: { assignedTo, assignedAt: assignedTo ? new Date().toISOString() : null },
      actorUserId: user.id,
      eventType: 'case.assigned',
      claimEventType: assignedTo ? 'claim_assigned' : 'claim_unassigned',
      eventPayload: { previous_assigned_to: claim.assigned_to ?? null, assigned_to: assignedTo },
    });
    return NextResponse.json({ claim: { id: claimId, assigned_to: assignedTo, state_version: updated.newVersion } });
  } catch (error) {
    if (error instanceof CaseVersionConflictError) return NextResponse.json({ error: 'Case was updated by another user. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}
