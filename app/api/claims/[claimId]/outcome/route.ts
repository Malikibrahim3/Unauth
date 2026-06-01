import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createOutcomeSchema, upsertMerchantCaseOutcome } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { loadClaimForMerchant, updateClaimStatus } from '@/lib/claims/access';
import { claimStatusForOutcome } from '@/lib/claims/statusMachine';

async function latestOutcome(serviceClient: any, claimId: string) {
  const { data } = await serviceClient
    .from('merchant_case_outcomes' as any)
    .select('decision,outcome,updated_at')
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
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
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

  const parsed = createOutcomeSchema.safeParse({ ...body as object, claim_id: claimId, shop_domain: claim.shop_domain });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid outcome payload' }, { status: 400 });

  try {
    const previous = await latestOutcome(serviceClient, claimId);
    const outcome = await upsertMerchantCaseOutcome(serviceClient, {
      ...parsed.data,
      actor_user_id: parsed.data.actor_user_id ?? user.id,
    });
    const newStatus = claimStatusForOutcome(parsed.data);
    await updateClaimStatus(serviceClient, claim, ctx.merchantId, newStatus);
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      shop_domain: claim.shop_domain,
      event_type: 'outcome_added',
      previous_status: claim.status,
      new_status: newStatus,
      previous_decision: previous?.decision ?? null,
      new_decision: outcome.decision,
      previous_outcome: previous?.outcome ?? null,
      new_outcome: outcome.outcome,
      note: parsed.data.notes ?? null,
      actor_user_id: user.id,
      triggered_by: 'merchant_manual',
      metadata: {
        triggered_by: 'merchant_manual',
        outcome_id: outcome.id,
        amount_refunded: outcome.amount_refunded ?? null,
        amount_recovered: outcome.amount_recovered ?? null,
      },
    });
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      shop_domain: claim.shop_domain,
      event_type: newStatus === 'escalated' ? 'escalation_added' : 'claim_resolved',
      previous_status: claim.status,
      new_status: newStatus,
      new_decision: outcome.decision,
      new_outcome: outcome.outcome,
      note: parsed.data.notes ?? null,
      actor_user_id: user.id,
      triggered_by: 'merchant_manual',
      metadata: { triggered_by: 'merchant_manual', outcome_id: outcome.id },
    });
    return NextResponse.json({ outcome: { id: outcome.id, claim_id: outcome.claim_id, decision: outcome.decision, outcome: outcome.outcome } });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('illegal_claim_status_transition:')) {
      return NextResponse.json({ error: 'Illegal claim status transition.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add outcome' }, { status: 500 });
  }
}
