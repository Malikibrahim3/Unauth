import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

const ruleSchema = z.object({
  rule_name: z.string().trim().min(1).max(160),
  rule_type: z.enum([
    'RECOVERY_ELIGIBILITY',
    'RECOVERY_NOT_WORTH_CHASING',
    'AUTO_RECOVERY_ELIGIBLE',
    'EVIDENCE_REQUIREMENT',
    'DEADLINE',
    'LIABILITY_CAP',
    'EXCLUSION',
    'ESCALATION',
    'INTERNAL_POLICY',
  ]),
  applies_to_claim_type: z.enum([
    'DELIVERED_NOT_RECEIVED',
    'ITEM_NOT_RECEIVED',
    'LOST_PARCEL',
    'DAMAGED_ITEM',
    'MISSING_ITEM',
    'WRONG_ITEM',
    'DELAYED_DELIVERY',
    'RETURN_EXCEPTION',
    'CHARGEBACK',
    'ANY',
  ]),
  recovery_eligible: z.enum(['eligible', 'not_eligible', 'pending_evidence']),
  recovery_route: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(1000),
  deadline_days: z.number().int().positive().max(3650).nullable().optional(),
  required_evidence: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  priority: z.number().int().min(1).max(1000).default(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid merchant-approved agreement terms are required.' }, { status: 400 });
  }

  const { data: agreement, error: agreementError } = await serviceClient
    .from(TABLES.AGREEMENTS)
    .select('id,counterparty_name,effective_from,effective_to,status')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (agreementError) return NextResponse.json({ error: agreementError.message }, { status: 500 });
  if (!agreement) return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 });
  if (agreement.status === 'archived') {
    return NextResponse.json({ error: 'Archived agreements cannot be activated.' }, { status: 409 });
  }

  const recoveryEligible = parsed.data.recovery_eligible === 'eligible'
    ? true
    : parsed.data.recovery_eligible === 'not_eligible'
      ? false
      : 'pending_evidence';
  const ruleCode = `MANUAL-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  const result = {
    recovery_eligible: recoveryEligible,
    recovery_route: parsed.data.recovery_route,
    reason: parsed.data.reason,
    required_evidence: parsed.data.required_evidence,
    ...(parsed.data.deadline_days ? { deadline_days: parsed.data.deadline_days } : {}),
  };

  const { data: rule, error: ruleError } = await serviceClient
    .from(TABLES.AGREEMENT_RULES)
    .insert({
      agreement_id: id,
      merchant_id: ctx.merchantId,
      counterparty_name: agreement.counterparty_name,
      rule_code: ruleCode,
      rule_name: parsed.data.rule_name,
      rule_type: parsed.data.rule_type,
      applies_to_claim_type: parsed.data.applies_to_claim_type,
      conditions: { all: [] },
      result,
      priority: parsed.data.priority,
      status: 'active',
      effective_from: agreement.effective_from,
      effective_to: agreement.effective_to,
    })
    .select('id,rule_code,rule_name,rule_type,applies_to_claim_type,status')
    .single();
  if (ruleError) return NextResponse.json({ error: ruleError.message }, { status: 500 });

  const now = new Date().toISOString();
  const [{ error: activateError }, { error: jobError }] = await Promise.all([
    serviceClient
      .from(TABLES.AGREEMENTS)
      .update({ status: 'active', updated_at: now })
      .eq('id', id)
      .eq('merchant_id', ctx.merchantId),
    serviceClient
      .from(TABLES.DOCUMENT_UPLOAD_JOBS)
      .update({ status: 'completed', updated_at: now })
      .eq('agreement_id', id)
      .eq('merchant_id', ctx.merchantId),
  ]);
  if (activateError || jobError) {
    await serviceClient
      .from(TABLES.AGREEMENT_RULES)
      .update({ status: 'archived', updated_at: now })
      .eq('id', rule.id)
      .eq('merchant_id', ctx.merchantId);
    return NextResponse.json({ error: activateError?.message ?? jobError?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, agreement_id: id, rule });
}
