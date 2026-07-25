import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import {
  CaseTransitionRejectedError,
  CaseVersionConflictError,
  transitionCase,
} from '@/lib/cases/transitionCase';
import {
  authorizeInvestigationRequest,
} from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { PERMISSIONS } from '@/lib/permissions';
import { maybeCreateRecoveryCaseFromSupportPayoutCase } from '@/lib/recoveries/createFromSupportPayoutCase';
import { TABLES } from '@/lib/supabase/tables';

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

  const { data: projection, error: projectionError } = await auth.service
    .from(TABLES.MERCHANT_CLAIMS)
    .select(
      'state_version,recovery_state,responsibility_confirmation_state,responsibility_event_id,loss_attribution,attribution_confidence,recoverability,recovery_owner',
    )
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', claimId)
    .maybeSingle();
  if (projectionError || !projection) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: 404 },
    );
  }
  if (projection.responsibility_confirmation_state === 'unconfirmed') {
    return NextResponse.json(
      {
        error: 'Confirm responsibility before opening the recovery handoff.',
        code: 'responsibility_confirmation_required',
      },
      { status: 422 },
    );
  }

  const { data: lossCase, error: lossError } = await auth.service
    .from(TABLES.LOSS_CASES)
    .select('id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('support_payout_case_id', claimId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lossError) {
    return NextResponse.json(
      { error: 'Could not verify the canonical loss.' },
      { status: 500 },
    );
  }
  if (!lossCase) {
    return NextResponse.json(
      {
        error: 'A source-confirmed canonical loss is required before recovery can open.',
        code: 'canonical_loss_required',
      },
      { status: 422 },
    );
  }

  try {
    const recovery = await maybeCreateRecoveryCaseFromSupportPayoutCase({
      client: auth.mutationClient,
      merchantId: auth.ctx.merchantId,
      supportPayoutCaseId: claimId,
      explicitHandoff: true,
    });
    if (!recovery) {
      return NextResponse.json(
        {
          error: 'The confirmed assessment does not currently produce a recoverable route.',
          code: 'recovery_route_not_available',
        },
        { status: 422 },
      );
    }

    let version = Number(projection.state_version ?? 1);
    let recoveryState = String(projection.recovery_state ?? 'no_recovery_needed');
    let domainEventId: string | null = null;
    if (recoveryState === 'no_recovery_needed') {
      const possible = await transitionCase(auth.mutationClient, {
        merchantId: auth.ctx.merchantId,
        caseId: claimId,
        expectedVersion: version,
        patch: { recoveryState: 'recovery_possible' },
        reason: 'Confirmed loss and responsibility have a recovery route',
        actorUserId: auth.user.id,
        triggeredBy: 'merchant_manual',
        eventType: 'case.recovery_handoff_ready',
        eventPayload: {
          recovery_case_id: recovery.id,
          loss_case_id: lossCase.id,
        },
        idempotencyKey: `${idempotencyKey}:possible`,
        handlerNames: [
          'financialProjection',
          'caseProjection',
          'notificationProjection',
          'workflowHandler',
          'auditTimelineProjection',
        ],
      });
      version = possible.newVersion;
      recoveryState = possible.recoveryState;
    }
    if (recoveryState === 'recovery_possible') {
      const opened = await transitionCase(auth.mutationClient, {
        merchantId: auth.ctx.merchantId,
        caseId: claimId,
        expectedVersion: version,
        patch: { recoveryState: 'recovery_opened' },
        reason: 'Merchant explicitly opened the recovery handoff',
        actorUserId: auth.user.id,
        triggeredBy: 'merchant_manual',
        eventType: 'case.recovery_handed_off',
        eventPayload: {
          recovery_case_id: recovery.id,
          loss_case_id: lossCase.id,
          responsibility_event_id: projection.responsibility_event_id,
        },
        idempotencyKey: `${idempotencyKey}:opened`,
        handlerNames: [
          'financialProjection',
          'caseProjection',
          'notificationProjection',
          'workflowHandler',
          'auditTimelineProjection',
        ],
      });
      version = opened.newVersion;
      recoveryState = opened.recoveryState;
      domainEventId = opened.domainEventId;
    }

    const recoverableAmount = recovery.estimated_recoverable_max
      ?? recovery.estimated_recoverable_min
      ?? recovery.eligible_loss_amount
      ?? 0;
    const entryKey = `${idempotencyKey}:recoverable`;
    const { data: existingEntry } = await auth.service
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .select('id')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('idempotency_key', entryKey)
      .maybeSingle();
    if (!existingEntry && recoverableAmount > 0) {
      const { error: entryError } = await auth.mutationClient
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .insert({
          merchant_id: auth.ctx.merchantId,
          support_payout_case_id: claimId,
          loss_case_id: lossCase.id,
          recovery_case_id: recovery.id,
          state: 'recoverable',
          amount_minor: Math.round(recoverableAmount * 100),
          currency: recovery.currency.toUpperCase(),
          direction: 'memo',
          domain_event_id: domainEventId,
          idempotency_key: entryKey,
          metadata: {
            migration_key: `recovery_handoff:${recovery.id}`,
            source: 'explicit_recovery_handoff',
          },
        });
      if (entryError && entryError.code !== '23505') {
        return NextResponse.json(
          {
            recovery_case: recovery,
            recovery_state: recoveryState,
            state_version: version,
            projection_status: 'pending_retry',
            error: 'Recovery opened, but its recoverable financial projection needs retry.',
          },
          { status: 202 },
        );
      }
      await auth.mutationClient.rpc('recompute_case_financial_summary', {
        p_case_id: claimId,
        p_merchant_id: auth.ctx.merchantId,
      });
    }

    return NextResponse.json({
      recovery_case: recovery,
      recovery_state: recoveryState,
      state_version: version,
      projection_status: 'completed',
      external_submission: 'not_performed',
    });
  } catch (error) {
    if (
      error instanceof CaseVersionConflictError
      || error instanceof CaseTransitionRejectedError
    ) {
      return NextResponse.json(
        {
          error: 'The case changed before recovery could be handed off. Refresh and retry.',
          code: error.message,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Recovery handoff failed. No external claim was submitted.' },
      { status: 500 },
    );
  }
}
