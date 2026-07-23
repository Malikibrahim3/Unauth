import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { recordMerchantCaseDecision } from '@/lib/claims/store';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';

const reverseBodySchema = z.object({
  decision: z.enum(['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed', 'internal_watch', 'no_action']),
  outcome: z.literal('pending').default('pending'),
  note: z.string().trim().min(3).max(4000),
  amount_minor: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).nullable().optional(),
});

const MONETARY_DECISIONS = new Set(['approved', 'partial_refund', 'full_refund', 'denied', 'no_action']);

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = reverseBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Reversal requires a new decision and reason.', issues: parsed.error.flatten() }, { status: 400 });
  }
  if (MONETARY_DECISIONS.has(parsed.data.decision) && (
    parsed.data.amount_minor == null || parsed.data.currency == null
  )) {
    return NextResponse.json({ error: 'This replacement decision requires an explicit amount and ISO currency.' }, { status: 400 });
  }

  try {
    const claim = loaded.claim!;
    const outcome = await recordMerchantCaseDecision(serviceClient, {
      decision: parsed.data.decision,
      outcome: 'pending',
      amount_minor: parsed.data.amount_minor ?? null,
      currency: parsed.data.currency ?? null,
      notes: parsed.data.note,
      merchantId: ctx.merchantId,
      caseId: claimId,
      expectedVersion: claim.state_version ?? 1,
      actorUserId: user.id,
      idempotencyKey,
      relatedSourceObject: {
        source_order_id: claim.source_order_id ?? null,
        source_ticket_id: claim.source_ticket_id ?? null,
      },
      reversal: true,
    });
    return NextResponse.json({
      outcome: {
        id: outcome.id,
        decision_id: outcome.decision_id,
        claim_id: outcome.claim_id,
        decision: outcome.decision,
        outcome: outcome.outcome,
        amount_minor: outcome.amount_minor,
        currency: outcome.currency,
      },
      projection: {
        domain_event_id: outcome.domain_event_id,
        state: 'queued',
        note: 'The original authorization remains immutable; its projected approval is reversed before the replacement decision is applied.',
      },
      replayed: outcome.replayed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('case_version_conflict') || message.includes('idempotency_conflict')) {
      return NextResponse.json({ error: 'The claim changed or this idempotency key was reused with different details.' }, { status: 409 });
    }
    if (message.includes('requires_prior_decision')) {
      return NextResponse.json({ error: 'No prior decision to reverse.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to reverse decision' }, { status: 500 });
  }
}
