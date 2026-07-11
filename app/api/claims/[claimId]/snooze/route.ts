import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

const snoozeSchema = z.object({
  snoozed_until: z.string().datetime().nullable(),
  reason: z.string().trim().max(500).nullable().optional(),
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
  const parsed = snoozeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid snooze payload' }, { status: 400 });

  const claim = loaded.claim!;
  try {
    const snoozed = parsed.data.snoozed_until !== null;
    const updated = await transitionCase(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      patch: snoozed ? { status: 'pending' } : {},
      attributes: { snoozedUntil: parsed.data.snoozed_until },
      reason: parsed.data.reason ?? null,
      actorUserId: user.id,
      eventType: 'case.updated',
      claimEventType: snoozed ? 'claim_snoozed' : 'claim_unsnoozed',
      eventPayload: { snoozed_until: parsed.data.snoozed_until },
      allowSnooze: snoozed,
    });
    return NextResponse.json({
      claim: {
        id: claimId,
        status: updated.status,
        snoozed_until: parsed.data.snoozed_until,
      },
    });
  } catch (error) {
    if (error instanceof CaseVersionConflictError) return NextResponse.json({ error: 'Case was updated by another user. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update snooze' }, { status: 500 });
  }
}
