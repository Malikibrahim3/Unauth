import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { upsertMerchantCaseOutcome } from '@/lib/claims/store';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { claimStatusForOutcome } from '@/lib/claims/statusMachine';
import { CaseTransitionRejectedError, CaseVersionConflictError, transitionCase } from '@/lib/cases/transitionCase';

const reverseBodySchema = z.object({
  // Accusation vocabulary ('blacklist', 'suspected_fraud') is not accepted; see lib/claims/store.ts.
  decision: z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action']),
  outcome: z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'legitimate']),
  note: z.string().trim().min(3),
  amount_refunded: z.number().finite().nullable().optional(),
  amount_recovered: z.number().finite().nullable().optional(),
});

async function latestOutcome(serviceClient: any, claimId: string) {
  const { data } = await serviceClient
    .from('claim_outcomes')
    .select('id,decision,outcome,updated_at')
    .eq('claim_id', claimId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

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

  const parsed = reverseBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Reversal requires a new decision, outcome, and reason.' }, { status: 400 });

  try {
    const claim = loaded.claim!;
    const previous = await latestOutcome(serviceClient, claimId);
    if (!previous) return NextResponse.json({ error: 'No prior decision to reverse.' }, { status: 409 });

    const outcome = await upsertMerchantCaseOutcome(serviceClient, {
      claim_id: claimId,
      decision: parsed.data.decision,
      outcome: parsed.data.outcome,
      amount_refunded: parsed.data.amount_refunded ?? null,
      amount_recovered: parsed.data.amount_recovered ?? null,
      notes: parsed.data.note,
      actor_user_id: user.id,
    }, { reversal: true });
    const status = claimStatusForOutcome(parsed.data);
    await transitionCase(serviceClient, {
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      patch: { status, payoutDecisionState: 'reversed' },
      reason: parsed.data.note,
      actorUserId: user.id,
      triggeredBy: 'merchant_manual',
      eventType: 'case.decision_recorded',
      eventPayload: { action: parsed.data.decision, reversal: true, outcome_id: outcome.id },
      claimEventType: 'decision_reversed',
      claimEventDetails: {
        previousDecision: previous.decision,
        newDecision: outcome.decision,
        previousOutcome: previous.outcome,
        newOutcome: outcome.outcome,
        metadata: { previous_outcome_id: previous.id, outcome_id: outcome.id },
      },
      allowDecisionReversal: true,
    });
    return NextResponse.json({ outcome: { id: outcome.id, claim_id: outcome.claim_id, decision: outcome.decision, outcome: outcome.outcome } });
  } catch (err) {
    if (err instanceof CaseTransitionRejectedError || err instanceof CaseVersionConflictError) {
      return NextResponse.json({ error: 'Illegal claim status transition.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to reverse decision' }, { status: 500 });
  }
}
