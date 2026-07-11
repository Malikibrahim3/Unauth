import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { RECOVERY_TYPES } from '@/lib/partners/types';
import {
  RECOVERY_CASE_STATUSES,
  RECOVERY_OWNER_TYPES,
  type RecoveryCase,
  type RecoveryCaseEvent,
  type RecoveryCaseEventType,
  type RecoveryCaseStatus,
} from '@/lib/recoveries/types';
import { eventTypeForStatus, nextStatusPatch } from '@/lib/recoveries/status';

const recoveryCaseStatusSchema = z.enum(RECOVERY_CASE_STATUSES);
const recoveryOwnerTypeSchema = z.enum(RECOVERY_OWNER_TYPES);
const recoveryTypeSchema = z.enum(RECOVERY_TYPES);

export const createRecoveryCaseSchema = z.object({
  merchant_id: z.string().uuid(),
  support_payout_case_id: z.string().uuid(),
  loss_case_id: z.string().uuid().nullable().optional(),
  prevention_only: z.boolean().optional(),
  partner_id: z.string().uuid().nullable().optional(),
  recovery_type: recoveryTypeSchema,
  owner_type: recoveryOwnerTypeSchema,
  status: recoveryCaseStatusSchema.default('draft'),
  merchant_loss_amount: z.number().finite().min(0),
  eligible_loss_amount: z.number().finite().min(0).nullable().optional(),
  estimated_recoverable_min: z.number().finite().min(0).nullable().optional(),
  estimated_recoverable_max: z.number().finite().min(0).nullable().optional(),
  amount_recovered: z.number().finite().min(0).nullable().optional(),
  currency: z.string().trim().min(1).max(8),
  deadline_at: z.string().datetime().nullable().optional(),
  next_chase_at: z.string().datetime().nullable().optional(),
  last_chased_at: z.string().datetime().nullable().optional(),
  evidence_required: z.array(z.string()).default([]),
  evidence_missing: z.array(z.string()).default([]),
  evidence_complete: z.boolean().default(false),
  rejection_reason: z.string().nullable().optional(),
  calculation_reason: z.array(z.string()).default([]),
  excluded_costs: z.array(z.object({
    label: z.string(),
    amount: z.number().finite().min(0).optional(),
    reason: z.string(),
  })).default([]),
  internal_owner_user_id: z.string().uuid().nullable().optional(),
});

export type CreateRecoveryCaseInput = z.input<typeof createRecoveryCaseSchema>;

function mapRecoveryCase(row: unknown): RecoveryCase {
  const r = row as RecoveryCase;
  return {
    ...r,
    merchant_loss_amount: Number(r.merchant_loss_amount ?? 0),
    eligible_loss_amount: r.eligible_loss_amount == null ? null : Number(r.eligible_loss_amount),
    estimated_recoverable_min: r.estimated_recoverable_min == null ? null : Number(r.estimated_recoverable_min),
    estimated_recoverable_max: r.estimated_recoverable_max == null ? null : Number(r.estimated_recoverable_max),
    amount_recovered: r.amount_recovered == null ? null : Number(r.amount_recovered),
    excluded_costs: Array.isArray(r.excluded_costs) ? r.excluded_costs : [],
  };
}

export async function listRecoveryCases(
  client: SupabaseClient,
  merchantId: string,
  filters: {
    status?: RecoveryCaseStatus;
    supportPayoutCaseId?: string;
    partnerId?: string;
  } = {},
): Promise<RecoveryCase[]> {
  let query = client
    .from(TABLES.RECOVERY_CASES)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .order('updated_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.supportPayoutCaseId) query = query.eq('support_payout_case_id', filters.supportPayoutCaseId);
  if (filters.partnerId) query = query.eq('partner_id', filters.partnerId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list recovery cases: ${error.message}`);
  return (data ?? []).map(mapRecoveryCase);
}

export async function getRecoveryCase(
  client: SupabaseClient,
  merchantId: string,
  recoveryCaseId: string,
): Promise<RecoveryCase | null> {
  const { data, error } = await client
    .from(TABLES.RECOVERY_CASES)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .eq('id', recoveryCaseId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get recovery case: ${error.message}`);
  return data ? mapRecoveryCase(data) : null;
}

export async function getRecoveryCaseForSupportPayoutCase(
  client: SupabaseClient,
  merchantId: string,
  supportPayoutCaseId: string,
): Promise<RecoveryCase | null> {
  const { data, error } = await client
    .from(TABLES.RECOVERY_CASES)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', supportPayoutCaseId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to get linked recovery case: ${error.message}`);
  return data ? mapRecoveryCase(data) : null;
}

export async function addRecoveryCaseEvent(
  client: SupabaseClient,
  input: {
    merchantId: string;
    recoveryCaseId: string;
    eventType: RecoveryCaseEventType;
    fromStatus?: RecoveryCaseStatus | null;
    toStatus?: RecoveryCaseStatus | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<RecoveryCaseEvent> {
  const { data, error } = await client
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .insert({
      merchant_id: input.merchantId,
      recovery_case_id: input.recoveryCaseId,
      event_type: input.eventType,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      note: input.note ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to add recovery event: ${error.message}`);
  return data as RecoveryCaseEvent;
}

export async function createRecoveryCase(
  client: SupabaseClient,
  input: CreateRecoveryCaseInput,
): Promise<RecoveryCase> {
  const parsed = createRecoveryCaseSchema.parse(input);
  if (!parsed.loss_case_id && parsed.prevention_only !== true) {
    throw new Error('createRecoveryCase requires a canonical loss_case_id unless prevention_only is set');
  }
  const { data, error } = await client
    .from(TABLES.RECOVERY_CASES)
    .insert({
      ...parsed,
      loss_case_id: parsed.loss_case_id ?? null,
      prevention_only: parsed.prevention_only ?? false,
      partner_id: parsed.partner_id ?? null,
      excluded_costs: parsed.excluded_costs,
      internal_owner_user_id: parsed.internal_owner_user_id ?? null,
    })
    .select('*, partner:partners(*)')
    .single();
  if (error) throw new Error(`Failed to create recovery case: ${error.message}`);
  const recoveryCase = mapRecoveryCase(data);
  await addRecoveryCaseEvent(client, {
    merchantId: parsed.merchant_id,
    recoveryCaseId: recoveryCase.id,
    eventType: 'created',
    toStatus: recoveryCase.status,
    metadata: { support_payout_case_id: parsed.support_payout_case_id },
  });
  return recoveryCase;
}

/**
 * Records an actual chase against a recovery case: stamps last_chased_at, sets
 * the next chase reminder, logs a 'chased' event, and returns the case to
 * waiting-for-response. This is the only path that marks a chase as done —
 * moving a case into 'chase_due' status does not.
 */
export async function markRecoveryCaseChased(
  client: SupabaseClient,
  input: { merchantId: string; recoveryCaseId: string; note?: string | null },
): Promise<RecoveryCase> {
  const existing = await getRecoveryCase(client, input.merchantId, input.recoveryCaseId);
  if (!existing) throw new Error('Recovery case not found');

  const now = new Date().toISOString();
  const nextChase = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from(TABLES.RECOVERY_CASES)
    .update({ status: 'waiting_response', last_chased_at: now, next_chase_at: nextChase })
    .eq('merchant_id', input.merchantId)
    .eq('id', input.recoveryCaseId)
    .select('*, partner:partners(*)')
    .single();
  if (error) throw new Error(`Failed to record chase: ${error.message}`);

  const updated = mapRecoveryCase(data);
  await addRecoveryCaseEvent(client, {
    merchantId: input.merchantId,
    recoveryCaseId: input.recoveryCaseId,
    eventType: 'chased',
    fromStatus: existing.status,
    toStatus: 'waiting_response',
    note: input.note ?? null,
    metadata: { chased_at: now },
  });
  return updated;
}

export async function updateRecoveryCaseStatus(
  client: SupabaseClient,
  input: {
    merchantId: string;
    recoveryCaseId: string;
    status: RecoveryCaseStatus;
    note?: string | null;
    amountRecovered?: number | null;
    rejectionReason?: string | null;
  },
): Promise<RecoveryCase> {
  const existing = await getRecoveryCase(client, input.merchantId, input.recoveryCaseId);
  if (!existing) throw new Error('Recovery case not found');

  const patch: Record<string, unknown> = {
    status: input.status,
    ...nextStatusPatch(input.status),
  };
  if (typeof input.amountRecovered === 'number') patch.amount_recovered = input.amountRecovered;
  if (typeof input.rejectionReason === 'string') patch.rejection_reason = input.rejectionReason;

  const { data, error } = await client
    .from(TABLES.RECOVERY_CASES)
    .update(patch)
    .eq('merchant_id', input.merchantId)
    .eq('id', input.recoveryCaseId)
    .select('*, partner:partners(*)')
    .single();
  if (error) throw new Error(`Failed to update recovery status: ${error.message}`);

  const updated = mapRecoveryCase(data);
  await addRecoveryCaseEvent(client, {
    merchantId: input.merchantId,
    recoveryCaseId: input.recoveryCaseId,
    eventType: eventTypeForStatus(input.status),
    fromStatus: existing.status,
    toStatus: input.status,
    note: input.note ?? null,
    metadata: {
      amount_recovered: input.amountRecovered ?? null,
      rejection_reason: input.rejectionReason ?? null,
    },
  });
  return updated;
}
