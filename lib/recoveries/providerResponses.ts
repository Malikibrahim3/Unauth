import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { PROVIDER_LIABILITY_POSITIONS, type RecoveryProviderResponse } from './types';

const PROVIDER_POSITION_COMPENSATION_STATES = [
  'not_decided',
  'approved',
  'partially_approved',
  'denied',
] as const;

export const providerResponseSchema = z.object({
  recovery_case_id: z.string().uuid(),
  submission_id: z.string().uuid().nullable().optional(),
  provider: z.string().trim().min(1).max(160),
  liability_position: z.enum(PROVIDER_LIABILITY_POSITIONS),
  compensation_state: z.enum(PROVIDER_POSITION_COMPENSATION_STATES),
  provider_amount_minor: z.number().int().min(0).nullable().optional(),
  approved_amount_minor: z.number().int().min(0).nullable().optional(),
  credited_amount_minor: z.null().optional(),
  currency: z.string().trim().max(8).nullable().optional(),
  external_reference: z.string().trim().max(500).nullable().optional(),
  external_url: z.string().trim().url().max(2000).nullable().optional().or(z.literal('')),
  response_evidence_item_id: z.string().uuid().nullable().optional(),
  response_correspondence_id: z.string().uuid().nullable().optional(),
  received_at: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
});

export type RecordProviderResponseInput = z.input<typeof providerResponseSchema>;

type UntypedClient = { rpc: (fn: string, args: Record<string, unknown>) => any; from: (table: string) => any };

function db(client: SupabaseClient): UntypedClient {
  return client as unknown as UntypedClient;
}

export async function recordProviderResponse(
  client: SupabaseClient,
  merchantId: string,
  actorUserId: string,
  input: RecordProviderResponseInput,
  idempotencyKey: string,
): Promise<{ response: RecoveryProviderResponse; replayed: boolean }> {
  const parsed = providerResponseSchema.parse(input);
  const query = db(client);
  const prior = await query.from(TABLES.RECOVERY_PROVIDER_RESPONSES)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (prior.error) throw new Error(`provider_response_lookup_failed: ${prior.error.message}`);
  if (prior.data) return { response: prior.data as RecoveryProviderResponse, replayed: true };
  const { data, error } = await query.rpc('record_recovery_provider_response', {
    p_merchant_id: merchantId,
    p_recovery_case_id: parsed.recovery_case_id,
    p_submission_id: parsed.submission_id ?? null,
    p_provider: parsed.provider,
    p_liability_position: parsed.liability_position,
    p_compensation_state: parsed.compensation_state,
    p_provider_amount_minor: parsed.provider_amount_minor ?? null,
    p_approved_amount_minor: parsed.approved_amount_minor ?? null,
    p_credited_amount_minor: parsed.credited_amount_minor ?? null,
    p_currency: parsed.currency?.toUpperCase() ?? null,
    p_external_reference: parsed.external_reference ?? null,
    p_external_url: parsed.external_url || null,
    p_response_evidence_item_id: parsed.response_evidence_item_id ?? null,
    p_response_correspondence_id: parsed.response_correspondence_id ?? null,
    p_received_at: parsed.received_at ?? new Date().toISOString(),
    p_recorded_by: actorUserId,
    p_notes: parsed.notes ?? null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(`provider_response_record_failed: ${error.message}`);
  const response = Array.isArray(data) ? data[0] : data;
  if (!response) throw new Error('provider_response_record_failed: no response returned');
  return { response: response as RecoveryProviderResponse, replayed: false };
}
