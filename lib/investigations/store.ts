import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type {
  CaseInvestigation,
  InvestigationAggregate,
} from '@/lib/investigations/types';
import {
  isInvestigationOverdue,
  isOpenInvestigation,
} from '@/lib/investigations/types';
import type {
  InvestigationAction,
} from '@/lib/investigations/lifecycle';

export class InvestigationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestigationConflictError';
  }
}

export class InvestigationNotFoundError extends Error {
  constructor() {
    super('investigation_not_found');
    this.name = 'InvestigationNotFoundError';
  }
}

function throwInvestigationError(error: { code?: string; message: string }): never {
  if (
    error.code === '40001'
    || error.code === '23505'
    || /conflict|already|must_be|only_|required|duplicate|immutable|invalid/.test(error.message)
  ) {
    throw new InvestigationConflictError(error.message);
  }
  if (error.code === 'P0002' || error.message.includes('not_found')) {
    throw new InvestigationNotFoundError();
  }
  throw new Error(`investigation_store_failed: ${error.message}`);
}

export async function listCaseInvestigations(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<CaseInvestigation[]> {
  const { data, error } = await client
    .from(TABLES.CASE_CLARIFICATION_REQUESTS)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`investigation_list_failed: ${error.message}`);
  return (data ?? []) as CaseInvestigation[];
}

export async function getCaseInvestigation(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  investigationId: string,
): Promise<CaseInvestigation | null> {
  const { data, error } = await client
    .from(TABLES.CASE_CLARIFICATION_REQUESTS)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('id', investigationId)
    .maybeSingle();
  if (error) throw new Error(`investigation_read_failed: ${error.message}`);
  return data as CaseInvestigation | null;
}

export function aggregateInvestigations(
  investigations: CaseInvestigation[],
  now = new Date(),
): InvestigationAggregate {
  const open = investigations.filter((item) => isOpenInvestigation(item.status));
  const waiting = investigations.filter((item) => item.status === 'waiting_response');
  const dueDates = waiting
    .map((item) => item.due_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  return {
    total: investigations.length,
    open: open.length,
    waiting: waiting.length,
    overdue: investigations.filter((item) => isInvestigationOverdue(item, now)).length,
    awaitingReview: investigations.filter((item) => item.status === 'response_received').length,
    primary: open.find((item) => item.is_primary) ?? null,
    nextDueAt: dueDates[0] ?? null,
  };
}

export async function createInvestigationDraft(
  client: SupabaseClient,
  input: {
    merchantId: string;
    caseId: string;
    actorUserId: string;
    idempotencyKey: string;
    targetType: string;
    targetName?: string | null;
    partnerId?: string | null;
    evidenceGap: string;
    recommendedReason?: string | null;
    overrideRationale?: string | null;
    requestedEvidence: string[];
    requestSummary: string;
    subject: string;
    requestBody: string;
    recipient?: string | null;
    sourceChannel?: string | null;
    dueAt?: string | null;
    isPrimary: boolean;
  },
): Promise<CaseInvestigation> {
  const { data, error } = await client.rpc('create_case_investigation', {
    p_merchant_id: input.merchantId,
    p_case_id: input.caseId,
    p_target_type: input.targetType,
    p_target_name: input.targetName ?? null,
    p_partner_id: input.partnerId ?? null,
    p_evidence_gap: input.evidenceGap,
    p_recommended_reason: input.recommendedReason ?? null,
    p_override_rationale: input.overrideRationale ?? null,
    p_requested_evidence: input.requestedEvidence,
    p_request_summary: input.requestSummary,
    p_subject: input.subject,
    p_request_body: input.requestBody,
    p_recipient: input.recipient ?? null,
    p_source_channel: input.sourceChannel ?? null,
    p_due_at: input.dueAt ?? null,
    p_is_primary: input.isPrimary,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throwInvestigationError(error);
  return data as CaseInvestigation;
}

export async function transitionInvestigation(
  client: SupabaseClient,
  input: {
    merchantId: string;
    caseId: string;
    investigationId: string;
    expectedVersion: number;
    action: InvestigationAction;
    patch: Record<string, unknown>;
    actorUserId: string;
    idempotencyKey: string;
  },
): Promise<CaseInvestigation> {
  const { data, error } = await client.rpc('transition_case_investigation', {
    p_merchant_id: input.merchantId,
    p_case_id: input.caseId,
    p_investigation_id: input.investigationId,
    p_expected_version: input.expectedVersion,
    p_action: input.action,
    p_patch: input.patch,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throwInvestigationError(error);
  return data as CaseInvestigation;
}
