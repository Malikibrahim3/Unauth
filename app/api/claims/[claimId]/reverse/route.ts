import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { upsertMerchantCaseOutcome } from '@/lib/claims/store';
import { loadClaimForMerchant, updateClaimStatus } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';

const reverseBodySchema = z.object({
  decision: z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'blacklist', 'no_action']),
  outcome: z.enum(['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'suspected_fraud', 'legitimate']),
  note: z.string().trim().min(3),
  amount_refunded: z.number().finite().nullable().optional(),
  amount_recovered: z.number().finite().nullable().optional(),
});

async function latestOutcome(serviceClient: any, claimId: string) {
  const { data } = await serviceClient
    .from('merchant_case_outcomes' as any)
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

  const parsed = reverseBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Reversal requires a new decision, outcome, and reason.' }, { status: 400 });

  try {
    const claim = loaded.claim!;
    const previous = await latestOutcome(serviceClient, claimId);
    if (!previous) return NextResponse.json({ error: 'No prior decision to reverse.' }, { status: 409 });

    const outcome = await upsertMerchantCaseOutcome(serviceClient, {
      claim_id: claimId,
      shop_domain: claim.shop_domain,
      decision: parsed.data.decision,
      outcome: parsed.data.outcome,
      amount_refunded: parsed.data.amount_refunded ?? null,
      amount_recovered: parsed.data.amount_recovered ?? null,
      notes: parsed.data.note,
      actor_user_id: user.id,
    });
    const status = parsed.data.decision === 'escalated' ? 'escalated' : 'resolved';
    await updateClaimStatus(serviceClient, claim, ctx.merchantId, status);
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      shop_domain: claim.shop_domain,
      event_type: 'decision_reversed',
      previous_status: claim.status,
      new_status: status,
      previous_decision: previous.decision,
      new_decision: outcome.decision,
      previous_outcome: previous.outcome,
      new_outcome: outcome.outcome,
      note: parsed.data.note,
      actor_user_id: user.id,
      metadata: { previous_outcome_id: previous.id, outcome_id: outcome.id },
    });
    return NextResponse.json({ outcome: { id: outcome.id, claim_id: outcome.claim_id, decision: outcome.decision, outcome: outcome.outcome } });
  } catch {
    return NextResponse.json({ error: 'Failed to reverse decision' }, { status: 500 });
  }
}
