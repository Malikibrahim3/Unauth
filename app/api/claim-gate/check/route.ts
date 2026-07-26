import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isValidatedApiKey, validateApiKey } from '@/lib/api/validateApiKey';
import { appendClaimEvent } from '@/lib/claims/events';
import { classifyClaim } from '@/lib/claim-gate/classifyClaim';
import { buildEvidence } from '@/lib/claim-gate/buildEvidence';
import { createOrUpdateClaim } from '@/lib/claim-gate/createOrUpdateClaim';
import { evaluateGateRules } from '@/lib/claim-gate/evaluateRules';
import { recommendFromEvidence, formatRecommendationNote } from '@/lib/claim-gate/buildRecommendation';
import { writeGateResultToGorgias } from '@/lib/claim-gate/writeBackToGorgias';
import { createAccountabilityWorkflow } from '@/lib/accountability/store';
import type { ClaimGateActorType, ClaimGateRequest, GateStatus } from '@/lib/claim-gate/types';
import type { GateRecommendation } from '@/lib/claim-gate/buildRecommendation';
import type { AccountabilityResult } from '@/lib/accountability/types';
import {
  isPublicClaimGateEnabled,
  publicClaimGateUnavailableBody,
} from '@/lib/claim-gate/releaseGate';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  merchant_id: z.string().uuid(),
  source: z.string().trim().optional().default('api'),
  actor_type: z.string().trim().optional().default('unknown'),
  ticket_id: z.string().trim().min(1),
  customer_email: z.string().trim().email(),
  order_id: z.string().trim().optional().nullable(),
  claim_text: z.string().trim().min(1),
  requested_action: z.string().trim().optional().nullable(),
  gorgias_domain: z.string().trim().optional().nullable(),
});

function normaliseActorType(value: string | undefined): ClaimGateActorType {
  if (value === 'human_agent' || value === 'ai_agent' || value === 'unknown') return value;
  if (value === 'human_agent_or_ai_agent') return 'unknown';
  return 'unknown';
}

function statusForGate(gateStatus: GateStatus): string {
  switch (gateStatus) {
    case 'ESCALATE':
      return 'escalated';
    case 'HOLD_FOR_REVIEW':
      return 'manual_review';
    case 'NEED_MORE_EVIDENCE':
    case 'ERROR_MANUAL_REVIEW':
      return 'evidence_needed';
    case 'PROCEED':
    default:
      return 'open';
  }
}

async function merchantExists(client: ReturnType<typeof createServiceClient>, merchantId: string) {
  const { data, error } = await client
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .maybeSingle();
  if (error) throw new Error(`claim_gate_merchant_lookup_failed: ${error.message}`);
  return Boolean(data);
}

async function persistGateStatus(input: {
  client: ReturnType<typeof createServiceClient>;
  merchantId: string;
  claimId: string;
  previousStatus: string;
  gateStatus: GateStatus;
  payload: ClaimGateRequest;
  responsePayload: Record<string, unknown>;
  recommendation: GateRecommendation;
}) {
  const nextStatus = statusForGate(input.gateStatus);
  const { error } = await input.client
    .from('support_payout_cases')
    .update({
      status: nextStatus,
      requires_review: input.gateStatus !== 'PROCEED',
      detection_detail: {
        source: input.payload.source ?? 'api',
        actor_type: input.payload.actor_type ?? 'unknown',
        external_ticket_id: input.payload.ticket_id ?? null,
        gorgias_domain: input.payload.gorgias_domain ?? null,
        requested_action_raw: input.payload.requested_action ?? null,
        gate_status: input.gateStatus,
        gate_recommendation: input.recommendation,
      },
    })
    .eq('id', input.claimId)
    .eq('merchant_id', input.merchantId);
  if (error) throw new Error(`claim_gate_status_persist_failed: ${error.message}`);

  await appendClaimEvent(input.client, {
    claim_id: input.claimId,
    merchant_id: input.merchantId,
    event_type: 'claim_updated',
    previous_status: input.previousStatus,
    new_status: nextStatus,
    note: `Claim gate checked: ${input.gateStatus}`,
    triggered_by: 'claim_gate_check',
    metadata: {
      gate_status: input.gateStatus,
      request_payload: input.payload,
      response_payload: input.responsePayload,
    },
  });
}

function accountabilitySummary(accountability: AccountabilityResult) {
  return {
    evidence_items: accountability.evidenceItems,
    loss_sources: accountability.lossSources.map((source) => ({
      id: source.id,
      source_type: source.source_type,
      confidence: source.confidence,
      accountable_party_type: source.accountable_party_type,
      accountable_party_name: source.accountable_party_name,
      money_at_risk: source.money_at_risk,
      potential_recovery_amount: source.potential_recovery_amount,
      status: source.status,
      evidence_summary: source.evidence_summary,
    })),
    recovery_tasks: accountability.recoveryTasks.map((task) => ({
      id: task.id,
      loss_source_id: task.loss_source_id,
      task_type: task.task_type,
      owner_type: task.owner_type,
      priority: task.priority,
      status: task.status,
      amount_to_recover: task.amount_to_recover,
      recovery_deadline: task.recovery_deadline,
      notes: task.notes,
    })),
    agreement_evaluation: accountability.agreementEvaluation ?? null,
  };
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!isValidatedApiKey(auth)) return auth;
  if (!isPublicClaimGateEnabled()) {
    return NextResponse.json(publicClaimGateUnavailableBody(), {
      status: 503,
      headers: { 'Retry-After': '3600' },
    });
  }

  const serviceClient = createServiceClient();
  let parsed: z.infer<typeof requestSchema>;

  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? 'Invalid claim gate request' },
        { status: 400 },
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (parsed.merchant_id !== auth.merchantId) {
      return NextResponse.json({ error: 'Merchant mismatch for API key' }, { status: 403 });
    }

    if (!(await merchantExists(serviceClient, parsed.merchant_id))) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const claimType = await classifyClaim(parsed.claim_text, parsed.requested_action);
    const evidence = await buildEvidence({
      client: serviceClient,
      merchantId: parsed.merchant_id,
      customerEmail: parsed.customer_email,
      externalOrderId: parsed.order_id ?? null,
      externalTicketId: parsed.ticket_id,
      claimText: parsed.claim_text,
      claimType,
    });

    const claim = await createOrUpdateClaim({
      client: serviceClient,
      merchantId: parsed.merchant_id,
      source: parsed.source,
      actorType: normaliseActorType(parsed.actor_type),
      externalTicketId: parsed.ticket_id,
      externalOrderId: parsed.order_id ?? null,
      customerEmail: parsed.customer_email,
      claimType,
      claimText: parsed.claim_text,
      requestedAction: parsed.requested_action ?? null,
      gorgiasDomain: parsed.gorgias_domain ?? null,
      evidence,
    });

    const decision = await evaluateGateRules({
      client: serviceClient,
      merchantId: parsed.merchant_id,
      claimId: claim.id,
      evidence,
    });

    const recommendation = recommendFromEvidence({ decision, evidence, claimType });

    const accountability = await createAccountabilityWorkflow(serviceClient, {
      claimId: claim.id,
      merchantId: parsed.merchant_id,
      claimType,
      evidence,
      gateDecision: decision,
    });

    const responsePayload = {
      gate_status: decision.gateStatus,
      claim_type: claimType,
      money_at_risk: evidence.moneyAtRisk,
      currency: evidence.currency,
      case_id: claim.id,
      case_url: claim.case_url,
      triggered_rules: decision.triggeredRules,
      evidence_summary: evidence.summary,
      policy_next_step: decision.policyNextStep,
      allowed_actions: decision.allowedActions,
      blocked_actions: decision.blockedActions,
      recommendation,
      note_for_agent: formatRecommendationNote(recommendation, claim.case_url),
      accountability_summary: accountabilitySummary(accountability),
    };

    await persistGateStatus({
      client: serviceClient,
      merchantId: parsed.merchant_id,
      claimId: claim.id,
      previousStatus: claim.status,
      gateStatus: decision.gateStatus,
      payload: parsed,
      responsePayload,
      recommendation,
    });

    const writeback = parsed.source === 'gorgias'
      ? await writeGateResultToGorgias({
          client: serviceClient,
          merchantId: parsed.merchant_id,
          externalTicketId: parsed.ticket_id,
          claim: { ...claim, status: statusForGate(decision.gateStatus) },
          decision,
          evidence,
          accountability,
          recommendationNote: formatRecommendationNote(recommendation, claim.case_url),
        })
      : { attempted: false, ok: false };

    return NextResponse.json({
      ...responsePayload,
      writeback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('claim-gate/check failed', { message });
    return NextResponse.json(
      {
        gate_status: 'ERROR_MANUAL_REVIEW',
        policy_next_step: 'Manual review required because Unauth could not complete the gate check.',
        error: 'claim_gate_check_failed',
      },
      { status: 500 },
    );
  }
}
