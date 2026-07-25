import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadClaimForMerchant } from '@/lib/claims/access';
import {
  claimInvestigationEmailDispatch,
  completeInvestigationEmailDispatch,
  investigationEmailRequestHash,
  sendClaimedInvestigationEmail,
} from '@/lib/investigations/dispatch';
import {
  authorizeInvestigationRequest,
  investigationErrorResponse,
} from '@/lib/investigations/routeAuth';
import {
  getCaseInvestigation,
  transitionInvestigation,
} from '@/lib/investigations/store';
import {
  idempotencyKeyFrom,
  sendInvestigationEmailSchema,
} from '@/lib/investigations/validation';
import { PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import {
  INVESTIGATION_EMAIL_DISABLED_MESSAGE,
  isInvestigationEmailDispatchEnabled,
} from '@/lib/investigations/flags';

const emailSchema = z.string().trim().email().max(320);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string; investigationId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
    { requireWriteFeature: true },
  );
  if (auth.response) return auth.response;
  if (!isInvestigationEmailDispatchEnabled()) {
    return NextResponse.json(
      {
        error: 'investigation_email_dispatch_disabled',
        message: INVESTIGATION_EMAIL_DISABLED_MESSAGE,
        manual_fallback_available: true,
      },
      { status: 503 },
    );
  }
  const { claimId, investigationId } = await params;
  const loaded = await loadClaimForMerchant(
    auth.service,
    claimId,
    auth.ctx.merchantId,
  );
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: 404 },
    );
  }
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'A valid Idempotency-Key header is required.' },
      { status: 400 },
    );
  }
  const parsed = sendInvestigationEmailSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A future response deadline is required.' },
      { status: 400 },
    );
  }
  if (new Date(parsed.data.due_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'The response deadline must be in the future.' },
      { status: 422 },
    );
  }

  const [investigation, merchantResult] = await Promise.all([
    getCaseInvestigation(
      auth.service,
      auth.ctx.merchantId,
      claimId,
      investigationId,
    ),
    auth.service
      .from(TABLES.MERCHANTS)
      .select('investigation_email_enabled,investigation_reply_to')
      .eq('id', auth.ctx.merchantId)
      .maybeSingle(),
  ]);
  if (!investigation) {
    return NextResponse.json(
      { error: 'Investigation not found' },
      { status: 404 },
    );
  }
  if (
    merchantResult.data?.investigation_email_enabled !== true
    || !merchantResult.data.investigation_reply_to
  ) {
    return NextResponse.json(
      {
        error: 'Investigation email is not enabled with a valid merchant reply-to address.',
        code: 'investigation_email_not_configured',
      },
      { status: 422 },
    );
  }
  const recipient = emailSchema.safeParse(investigation.recipient);
  const replyTo = emailSchema.safeParse(
    merchantResult.data.investigation_reply_to,
  );
  if (!recipient.success || !replyTo.success) {
    return NextResponse.json(
      {
        error: 'A valid recipient and merchant reply-to address are required.',
        code: 'investigation_email_address_invalid',
      },
      { status: 422 },
    );
  }

  const requestHash = investigationEmailRequestHash({
    investigationId,
    recipient: recipient.data.toLowerCase(),
    replyTo: replyTo.data.toLowerCase(),
    subject: investigation.subject,
    body: investigation.request_body,
  });

  try {
    const dispatch = await claimInvestigationEmailDispatch(
      auth.mutationClient,
      {
        merchantId: auth.ctx.merchantId,
        investigationId,
        actorUserId: auth.user.id,
        idempotencyKey,
        requestHash,
      },
    );

    let acceptedDispatch = dispatch;
    if (dispatch.status !== 'accepted') {
      if (!dispatch.claimed || !dispatch.lease_token) {
        return NextResponse.json(
          {
            error: 'This logical email send is already processing. Retry shortly with the same Idempotency-Key.',
            code: 'investigation_email_processing',
            dispatch_id: dispatch.id,
          },
          { status: 409 },
        );
      }
      const sent = await sendClaimedInvestigationEmail({
        investigation,
        replyTo: replyTo.data,
        providerIdempotencyKey: `investigation/${dispatch.id}`,
      });
      if (!sent.ok || !sent.providerId) {
        const failedDispatch = await completeInvestigationEmailDispatch(auth.mutationClient, {
          merchantId: auth.ctx.merchantId,
          dispatchId: dispatch.id,
          leaseToken: dispatch.lease_token,
          accepted: false,
          error: sent.error ?? 'Email provider did not return an acceptance ID.',
        });
        await recordDomainEvent(auth.mutationClient, {
          merchantId: auth.ctx.merchantId,
          eventType: 'investigation.send_failed',
          aggregateType: 'case_investigation',
          aggregateId: investigationId,
          idempotencyKey: `investigation-send-failed:${dispatch.id}:${failedDispatch.attempt_count}`,
          actorType: 'user',
          actorId: auth.user.id,
          payload: {
            investigation_id: investigationId,
            case_id: claimId,
            target_type: investigation.target_type,
            channel: 'email',
            dispatch_id: dispatch.id,
            manual_fallback_available: true,
          },
          handlers: ['notificationProjection', 'auditTimelineProjection'],
        }).catch((eventError: unknown) => {
          console.error('investigation_send_failed_event_record_failed', {
            dispatchId: dispatch.id,
            message: eventError instanceof Error ? eventError.message : String(eventError),
          });
        });
        return NextResponse.json(
          {
            error: sent.skipped
              ? 'Email transport is not configured. The request remains a draft; use copy or manual send.'
              : 'The email provider did not accept the request. It remains a draft.',
            code: sent.skipped
              ? 'investigation_email_transport_unconfigured'
              : 'investigation_email_provider_failed',
            manual_fallback_available: true,
          },
          { status: 503 },
        );
      }
      acceptedDispatch = await completeInvestigationEmailDispatch(
        auth.mutationClient,
        {
          merchantId: auth.ctx.merchantId,
          dispatchId: dispatch.id,
          leaseToken: dispatch.lease_token,
          accepted: true,
          providerMessageId: sent.providerId,
        },
      );
    }

    const current = await getCaseInvestigation(
      auth.service,
      auth.ctx.merchantId,
      claimId,
      investigationId,
    );
    if (!current) {
      return NextResponse.json(
        {
          error: 'Provider accepted the email, but investigation reconciliation needs retry.',
          code: 'investigation_email_reconciliation_pending',
          dispatch_id: acceptedDispatch.id,
        },
        { status: 202 },
      );
    }
    if (current.status === 'waiting_response') {
      return NextResponse.json({
        investigation: current,
        dispatch: acceptedDispatch,
        replayed: true,
      });
    }
    const transitioned = await transitionInvestigation(
      auth.mutationClient,
      {
        merchantId: auth.ctx.merchantId,
        caseId: claimId,
        investigationId,
        expectedVersion: parsed.data.expected_version,
        action: 'send_accepted',
        patch: {
          source_channel: 'email',
          due_at: parsed.data.due_at,
          provider_message_id: acceptedDispatch.provider_message_id,
          case_version: loaded.claim.state_version ?? 1,
        },
        actorUserId: auth.user.id,
        idempotencyKey: `email-transition:${acceptedDispatch.id}`,
      },
    );
    return NextResponse.json({
      investigation: transitioned,
      dispatch: acceptedDispatch,
      replayed: Boolean(dispatch.replayed),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/idempotency_conflict/.test(message)) {
      return NextResponse.json(
        {
          error: 'This Idempotency-Key was already used for different email content.',
          code: 'investigation_email_idempotency_conflict',
        },
        { status: 409 },
      );
    }
    return investigationErrorResponse(error);
  }
}
