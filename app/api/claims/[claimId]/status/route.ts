import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { CANONICAL_CLAIM_STATUSES } from '@/lib/claims/statusMachine';
import { CaseTransitionRejectedError, CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

const statusBodySchema = z.object({
  status: z.enum(CANONICAL_CLAIM_STATUSES),
  note: z.string().trim().min(3),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = statusBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Status change requires a note.' }, { status: 400 });

  try {
    const claim = loaded.claim!;
    const updated = await transitionCase(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      patch: { status: parsed.data.status },
      reason: parsed.data.note,
      actorUserId: user.id,
      triggeredBy: 'merchant_manual',
      eventType: 'case.updated',
    });
    return NextResponse.json({ claim: { id: updated.caseId, status: updated.status, state_version: updated.newVersion } });
  } catch (err) {
    if (err instanceof CaseTransitionRejectedError) {
      return NextResponse.json({ error: 'Illegal claim status transition.' }, { status: 409 });
    }
    if (err instanceof CaseVersionConflictError) return NextResponse.json({ error: 'Case was updated by another user. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update claim status' }, { status: 500 });
  }
}
