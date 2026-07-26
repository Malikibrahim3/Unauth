import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { buildClaimDecisionContext } from '@/lib/claims/decision/context';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { upsertClaimEvidence } from '@/lib/integrations/canonicalEvidence';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import {
  authorizeInvestigationRequest,
} from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

const findingSchema = z.object({
  finding: z.enum(['consistent', 'inconsistent', 'unclear']),
  rationale: z.string().trim().min(5).max(2000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(
    auth.service,
    claimId,
    auth.ctx.merchantId,
  );
  if (!loaded.claim) {
    return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  }
  const { data, error } = await auth.service
    .from(TABLES.EVIDENCE_ITEMS)
    .select('id,structured_value,summary,source_created_at,created_at,created_by')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('claim_id', claimId)
    .eq('evidence_type', 'delivery_photo_finding')
    .order('source_created_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Unable to load delivery photo finding.' }, { status: 500 });
  }
  return NextResponse.json({ finding: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(
    auth.service,
    claimId,
    auth.ctx.merchantId,
  );
  if (!loaded.claim) {
    return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  }
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'A valid Idempotency-Key header is required.' },
      { status: 400 },
    );
  }
  const parsed = findingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A finding and a short rationale are required.' },
      { status: 400 },
    );
  }
  const context = await buildClaimDecisionContext(
    auth.service,
    auth.ctx.merchantId,
    claimId,
  );
  if (!context?.delivery?.deliveryPhotoAvailable) {
    return NextResponse.json(
      { error: 'No carrier delivery photo is available for this case.' },
      { status: 422 },
    );
  }
  const evidenceId = stableEvidenceId(
    auth.ctx.merchantId,
    'delivery-photo-finding',
    claimId,
    idempotencyKey,
  );
  const { data: existing } = await auth.service
    .from(TABLES.EVIDENCE_ITEMS)
    .select('id,structured_value,summary,source_created_at,created_at,created_by')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('claim_id', claimId)
    .eq('id', evidenceId)
    .maybeSingle();
  if (existing) {
    const structured = existing.structured_value as Record<string, unknown> | null;
    if (
      structured?.finding !== parsed.data.finding
      || structured?.rationale !== parsed.data.rationale
    ) {
      return NextResponse.json(
        { error: 'This Idempotency-Key was already used for a different finding.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ finding: existing, replayed: true });
  }

  const occurredAt = new Date().toISOString();
  const evidence = await upsertClaimEvidence(auth.mutationClient, {
    id: evidenceId,
    merchantId: auth.ctx.merchantId,
    claimId,
    evidenceType: 'delivery_photo_finding',
    title: 'Merchant delivery photo finding',
    summary: parsed.data.rationale,
    sourceSystem: 'merchant_review',
    sourceRecordId: claimId,
    sourceCreatedAt: occurredAt,
    structuredValue: parsed.data,
    sourceMetadata: {
      source: 'merchant_review',
      migration_key: `delivery_photo_finding:${idempotencyKey}`,
      human_reviewed: true,
    },
    createdBy: auth.user.id,
  });
  await recordDomainEvent(auth.mutationClient, {
    merchantId: auth.ctx.merchantId,
    eventType: 'evidence.updated',
    aggregateType: 'case',
    aggregateId: claimId,
    idempotencyKey: `delivery-photo-finding:${idempotencyKey}`,
    actorType: 'user',
    actorId: auth.user.id,
    payload: {
      case_id: claimId,
      evidence_item_id: evidence.id,
      evidence_type: 'delivery_photo_finding',
      finding: parsed.data.finding,
    },
    handlers: [
      'caseProjection',
      'notificationProjection',
      'workflowHandler',
      'auditTimelineProjection',
    ],
  });

  let reevaluationStatus: 'completed' | 'pending_retry' = 'completed';
  try {
    await evaluateClaimDecision({
      client: auth.mutationClient,
      merchantId: auth.ctx.merchantId,
      claimId,
      actorId: auth.user.id,
      source: 'claim_review',
      attachDeliveryEvidence: false,
    });
  } catch {
    reevaluationStatus = 'pending_retry';
  }
  return NextResponse.json(
    {
      finding: evidence,
      replayed: false,
      reevaluation_status: reevaluationStatus,
    },
    { status: reevaluationStatus === 'completed' ? 201 : 202 },
  );
}
