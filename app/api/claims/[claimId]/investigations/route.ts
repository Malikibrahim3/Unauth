import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { previewClaimDecision } from '@/lib/claims/decision/evaluate';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { listPartners } from '@/lib/partners/store';
import { TABLES } from '@/lib/supabase/tables';
import {
  aggregateInvestigations,
  createInvestigationDraft,
  listCaseInvestigations,
} from '@/lib/investigations/store';
import { recommendInvestigation } from '@/lib/investigations/recommend';
import { composeInvestigationRequest } from '@/lib/investigations/templates';
import { createInvestigationSchema, idempotencyKeyFrom } from '@/lib/investigations/validation';
import {
  authorizeInvestigationRequest,
  investigationErrorResponse,
} from '@/lib/investigations/routeAuth';
import {
  areInvestigationWritesEnabled,
  INVESTIGATION_WRITES_DISABLED_MESSAGE,
  isInvestigationEmailDispatchEnabled,
} from '@/lib/investigations/flags';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }
  const writesEnabled = areInvestigationWritesEnabled();
  const emailDispatchEnabled = isInvestigationEmailDispatchEnabled();

  const [
    investigations,
    preview,
    partners,
    merchantSettings,
    canMutate,
    responsibilityResult,
    evidenceResult,
  ] = await Promise.all([
    listCaseInvestigations(auth.service, auth.ctx.merchantId, claimId),
    previewClaimDecision({
      client: auth.service,
      merchantId: auth.ctx.merchantId,
      claimId,
    }),
    listPartners(auth.service, auth.ctx.merchantId, { status: 'active' }),
    auth.service
      .from(TABLES.MERCHANTS)
      .select('investigation_response_sla_hours, investigation_reply_to, investigation_email_enabled')
      .eq('id', auth.ctx.merchantId)
      .maybeSingle(),
    hasPermission(auth.service, auth.ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
    auth.service
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        'state_version,loss_attribution,attribution_confidence,recoverability,recovery_owner,responsibility_confirmation_state,responsibility_confirmed_at,responsibility_confirmed_by,responsibility_event_id',
      )
      .eq('id', claimId)
      .eq('merchant_id', auth.ctx.merchantId)
      .maybeSingle(),
    auth.service
      .from(TABLES.EVIDENCE_ITEMS)
      .select('id,evidence_type,title,summary,source_system,occurred_at,created_at')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('claim_id', claimId)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .limit(100),
  ]);

  const aggregate = aggregateInvestigations(investigations);
  const recommendation = preview && aggregate.open === 0
    ? recommendInvestigation({
        context: preview.context,
        payoutCase: preview.payoutCase,
        partners,
        responseSlaHours:
          merchantSettings.data?.investigation_response_sla_hours ?? 48,
      })
    : null;
  const suggestedRequest = recommendation
    ? composeInvestigationRequest({
        recommendation,
        caseReference: claimId,
        orderReference: preview?.context.order?.orderNumber ?? null,
      })
    : null;

  return NextResponse.json({
    investigations,
    aggregate,
    recommendation,
    suggested_request: suggestedRequest,
    partners: partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      partner_type: partner.partner_type,
      contact_email: partner.contact_email,
      contact_url: partner.contact_url,
      default_contact_channel: partner.default_contact_channel ?? null,
      response_sla_hours: partner.response_sla_hours ?? null,
      contact_instructions: partner.contact_instructions ?? null,
    })),
    settings: {
      reply_to_configured: Boolean(merchantSettings.data?.investigation_reply_to),
      email_enabled:
        emailDispatchEnabled
        && merchantSettings.data?.investigation_email_enabled === true,
    },
    responsibility: responsibilityResult.data ?? null,
    evidence_options: evidenceResult.data ?? [],
    permissions: {
      can_mutate: writesEnabled && canMutate,
      writes_enabled: writesEnabled,
      disabled_reason: writesEnabled
        ? null
        : INVESTIGATION_WRITES_DISABLED_MESSAGE,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
    { requireWriteFeature: true },
  );
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  const parsed = createInvestigationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid investigation draft.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const input = parsed.data;
    const [preview, partners, merchantSettings] = await Promise.all([
      previewClaimDecision({
        client: auth.service,
        merchantId: auth.ctx.merchantId,
        claimId,
      }),
      listPartners(auth.service, auth.ctx.merchantId, { status: 'active' }),
      auth.service
        .from(TABLES.MERCHANTS)
        .select('investigation_response_sla_hours')
        .eq('id', auth.ctx.merchantId)
        .maybeSingle(),
    ]);
    const recommendation = preview
      ? recommendInvestigation({
          context: preview.context,
          payoutCase: preview.payoutCase,
          partners,
          responseSlaHours:
            merchantSettings.data?.investigation_response_sla_hours ?? 48,
        })
      : null;
    const overridesRecommendation = recommendation
      ? input.target_type !== recommendation.targetType
        || (input.partner_id ?? null) !== recommendation.partnerId
        || input.evidence_gap.trim() !== recommendation.evidenceGap
      : false;
    if (overridesRecommendation && !input.override_rationale) {
      return NextResponse.json(
        {
          error: 'Explain why this request differs from the current recommendation.',
          code: 'investigation_override_rationale_required',
        },
        { status: 422 },
      );
    }
    const investigation = await createInvestigationDraft(auth.mutationClient, {
      merchantId: auth.ctx.merchantId,
      caseId: claimId,
      actorUserId: auth.user.id,
      idempotencyKey,
      targetType: input.target_type,
      targetName: input.target_name,
      partnerId: input.partner_id,
      evidenceGap: input.evidence_gap,
      recommendedReason: input.recommended_reason,
      overrideRationale: input.override_rationale,
      requestedEvidence: input.requested_evidence,
      requestSummary: input.request_summary,
      subject: input.subject,
      requestBody: input.request_body,
      recipient: input.recipient,
      sourceChannel: input.source_channel,
      dueAt: input.due_at || null,
      isPrimary: input.is_primary,
    });
    const investigations = await listCaseInvestigations(
      auth.service,
      auth.ctx.merchantId,
      claimId,
    );
    return NextResponse.json(
      { investigation, aggregate: aggregateInvestigations(investigations) },
      { status: 201 },
    );
  } catch (error) {
    return investigationErrorResponse(error);
  }
}
