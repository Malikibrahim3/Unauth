import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { isFinalClaimStatus } from '@/lib/claims/sla';
import { CaseTransitionRejectedError, CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

const reopenBodySchema = z.object({
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

  const parsed = reopenBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Reopen requires a reason.' }, { status: 400 });

  const claim = loaded.claim!;
  if (!isFinalClaimStatus(claim.status)) {
    return NextResponse.json({ error: 'Only final claims can be reopened.' }, { status: 409 });
  }

  try {
    const updated = await transitionCase(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      patch: { status: 'open' },
      reason: parsed.data.note,
      actorUserId: user.id,
      triggeredBy: 'merchant_manual_reopen',
      eventType: 'case.updated',
      claimEventType: 'claim_reopened',
      allowReopen: true,
    });
    return NextResponse.json({ claim: { id: updated.caseId, status: updated.status, state_version: updated.newVersion } });
  } catch (error) {
    if (error instanceof CaseTransitionRejectedError || error instanceof CaseVersionConflictError) {
      return NextResponse.json({ error: 'Case was updated by another user. Refresh and try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to reopen claim' }, { status: 500 });
  }
}
