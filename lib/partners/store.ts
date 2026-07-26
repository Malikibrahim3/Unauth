import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import {
  PARTNER_RULE_CLAIM_TYPES,
  PARTNER_TYPES,
  RECOVERY_TYPES,
  type Partner,
  type PartnerRecoveryRule,
} from '@/lib/partners/types';

const partnerTypeSchema = z.enum(PARTNER_TYPES);
const recoveryTypeSchema = z.enum(RECOVERY_TYPES);
const partnerRuleClaimTypeSchema = z.enum(PARTNER_RULE_CLAIM_TYPES);
const partnerContactChannelSchema = z.enum(['email', 'portal', 'manual', 'api']);

export const createPartnerSchema = z.object({
  merchant_id: z.string().uuid(),
  partner_type: partnerTypeSchema,
  name: z.string().trim().min(1).max(160),
  external_reference: z.string().trim().max(160).nullish(),
  contact_email: z.string().trim().email().max(240).nullish().or(z.literal('')),
  contact_url: z.string().trim().url().max(500).nullish().or(z.literal('')),
  notes: z.string().trim().max(2000).nullish(),
  default_contact_channel: partnerContactChannelSchema.nullish(),
  response_sla_hours: z.number().int().min(1).max(2160).nullish(),
  contact_instructions: z.string().trim().max(4000).nullish(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const createPartnerRecoveryRuleSchema = z.object({
  merchant_id: z.string().uuid(),
  partner_id: z.string().uuid().nullable().optional(),
  rule_name: z.string().trim().min(1).max(180),
  recovery_type: recoveryTypeSchema,
  applies_to_claim_type: partnerRuleClaimTypeSchema,
  claimable_costs: z.array(z.string().trim().min(1)).default([]),
  excluded_costs: z.array(z.string().trim().min(1)).default([]),
  required_evidence: z.array(z.string().trim().min(1)).default([]),
  deadline_days: z.number().int().min(0).nullable().optional(),
  liability_cap_amount: z.number().finite().min(0).nullable().optional(),
  liability_cap_currency: z.string().trim().max(8).nullable().optional(),
  liability_cap_basis: z.enum(['fixed', 'declared_value', 'insured_value', 'contractual', 'unknown']).nullable().optional(),
  submission_method: z.enum(['portal', 'email', 'api', 'unknown']).nullable().optional(),
  submission_url: z.string().trim().url().max(500).nullable().optional().or(z.literal('')),
  submission_email: z.string().trim().email().max(240).nullable().optional().or(z.literal('')),
  source_type: z.enum(['unauth_default', 'merchant_configured', 'contract_extracted']).default('merchant_configured'),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  active: z.boolean().default(true),
});

export type CreatePartnerInput = z.input<typeof createPartnerSchema>;
export type CreatePartnerRecoveryRuleInput = z.input<typeof createPartnerRecoveryRuleSchema>;

function cleanOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireMerchantPartner(
  client: SupabaseClient,
  merchantId: string,
  partnerId: string | null | undefined,
): Promise<void> {
  if (!partnerId) return;
  const { data, error } = await client
    .from(TABLES.PARTNERS)
    .select('id')
    .eq('id', partnerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to validate recovery partner: ${error.message}`);
  if (!data) throw new Error('Recovery partner does not belong to this merchant');
}

export async function listPartners(
  client: SupabaseClient,
  merchantId: string,
  filters: { status?: 'active' | 'inactive'; partnerType?: string } = {},
): Promise<Partner[]> {
  let query = client
    .from(TABLES.PARTNERS)
    .select('*')
    .eq('merchant_id', merchantId)
    .order('name', { ascending: true });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.partnerType) query = query.eq('partner_type', filters.partnerType);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list partners: ${error.message}`);
  return (data ?? []) as Partner[];
}

export async function createPartner(
  client: SupabaseClient,
  input: CreatePartnerInput,
): Promise<Partner> {
  const parsed = createPartnerSchema.parse(input);
  const { data, error } = await client
    .from(TABLES.PARTNERS)
    .insert({
      ...parsed,
      contact_email: cleanOptionalString(parsed.contact_email),
      contact_url: cleanOptionalString(parsed.contact_url),
      external_reference: cleanOptionalString(parsed.external_reference),
      notes: cleanOptionalString(parsed.notes),
      contact_instructions: cleanOptionalString(parsed.contact_instructions),
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create partner: ${error.message}`);
  return data as Partner;
}

export const updatePartnerSchema = createPartnerSchema.partial().omit({ merchant_id: true });
export const updatePartnerRecoveryRuleSchema = createPartnerRecoveryRuleSchema.partial().omit({ merchant_id: true });
export type UpdatePartnerInput = z.input<typeof updatePartnerSchema>;
export type UpdatePartnerRecoveryRuleInput = z.input<typeof updatePartnerRecoveryRuleSchema>;

export async function updatePartner(
  client: SupabaseClient,
  merchantId: string,
  partnerId: string,
  patch: UpdatePartnerInput,
): Promise<Partner> {
  const parsed = updatePartnerSchema.parse(patch);
  const payload: Record<string, unknown> = { ...parsed };
  if ('contact_email' in parsed) payload.contact_email = cleanOptionalString(parsed.contact_email);
  if ('contact_url' in parsed) payload.contact_url = cleanOptionalString(parsed.contact_url);
  if ('external_reference' in parsed) payload.external_reference = cleanOptionalString(parsed.external_reference);
  if ('notes' in parsed) payload.notes = cleanOptionalString(parsed.notes);
  if ('contact_instructions' in parsed) {
    payload.contact_instructions = cleanOptionalString(parsed.contact_instructions);
  }
  const { data, error } = await client
    .from(TABLES.PARTNERS)
    .update(payload)
    .eq('merchant_id', merchantId)
    .eq('id', partnerId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update partner: ${error.message}`);
  return data as Partner;
}

export async function updatePartnerRecoveryRule(
  client: SupabaseClient,
  merchantId: string,
  ruleId: string,
  patch: UpdatePartnerRecoveryRuleInput,
): Promise<PartnerRecoveryRule> {
  const parsed = updatePartnerRecoveryRuleSchema.parse(patch);
  if ('partner_id' in parsed) {
    await requireMerchantPartner(client, merchantId, parsed.partner_id);
  }
  const payload: Record<string, unknown> = { ...parsed };
  if ('submission_url' in parsed) payload.submission_url = cleanOptionalString(parsed.submission_url);
  if ('submission_email' in parsed) payload.submission_email = cleanOptionalString(parsed.submission_email);
  const { data, error } = await client
    .from(TABLES.PARTNER_RECOVERY_RULES)
    .update(payload)
    .eq('merchant_id', merchantId)
    .eq('id', ruleId)
    .select('*, partner:partners(*)')
    .single();
  if (error) throw new Error(`Failed to update partner recovery rule: ${error.message}`);
  return data as PartnerRecoveryRule;
}

export async function listPartnerRecoveryRules(
  client: SupabaseClient,
  merchantId: string,
  filters: {
    partnerId?: string | null;
    recoveryType?: string;
    claimType?: string;
    active?: boolean;
  } = {},
): Promise<PartnerRecoveryRule[]> {
  let query = client
    .from(TABLES.PARTNER_RECOVERY_RULES)
    .select('*, partner:partners(*)')
    .eq('merchant_id', merchantId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.partnerId) query = query.eq('partner_id', filters.partnerId);
  if (filters.recoveryType) query = query.eq('recovery_type', filters.recoveryType);
  if (filters.claimType) query = query.eq('applies_to_claim_type', filters.claimType);
  if (typeof filters.active === 'boolean') query = query.eq('active', filters.active);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list partner recovery rules: ${error.message}`);
  return (data ?? []) as PartnerRecoveryRule[];
}

export async function createPartnerRecoveryRule(
  client: SupabaseClient,
  input: CreatePartnerRecoveryRuleInput,
): Promise<PartnerRecoveryRule> {
  const parsed = createPartnerRecoveryRuleSchema.parse(input);
  await requireMerchantPartner(client, parsed.merchant_id, parsed.partner_id);
  const { data, error } = await client
    .from(TABLES.PARTNER_RECOVERY_RULES)
    .insert({
      ...parsed,
      partner_id: parsed.partner_id ?? null,
      submission_url: cleanOptionalString(parsed.submission_url),
      submission_email: cleanOptionalString(parsed.submission_email),
    })
    .select('*, partner:partners(*)')
    .single();
  if (error) throw new Error(`Failed to create partner recovery rule: ${error.message}`);
  return data as PartnerRecoveryRule;
}

export async function findBestPartnerRecoveryRule(
  client: SupabaseClient,
  input: {
    merchantId: string;
    recoveryType: string;
    claimType: string;
    partnerId?: string | null;
  },
): Promise<PartnerRecoveryRule | null> {
  const rules = await listPartnerRecoveryRules(client, input.merchantId, {
    recoveryType: input.recoveryType,
    claimType: input.claimType,
    active: true,
  });
  if (input.partnerId) {
    const exact = rules.find((rule) => rule.partner_id === input.partnerId);
    if (exact) return exact;
  }
  return rules.find((rule) => rule.partner_id != null) ?? rules[0] ?? null;
}
