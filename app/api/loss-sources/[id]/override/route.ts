import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { appendClaimEvent } from '@/lib/claims/events';
import { writeAccountabilityNoteToGorgias } from '@/lib/claim-gate/writeBackToGorgias';

const sourceTypeSchema = z.enum([
  'CUSTOMER_CLAIM',
  'CARRIER_FAILURE',
  'WAREHOUSE_3PL_ERROR',
  'MERCHANT_POLICY_LEAKAGE',
  'SUPPORT_AGENT_OVERRIDE',
  'AI_AGENT_OVERRIDE',
  'PRODUCT_ISSUE',
  'PAYMENT_DISPUTE_RISK',
  'RETURN_ABUSE',
  'UNKNOWN',
]);

const accountablePartySchema = z.enum([
  'CUSTOMER',
  'CARRIER',
  'WAREHOUSE_3PL',
  'MERCHANT',
  'SUPPORT_TEAM',
  'AI_AGENT',
  'PAYMENT_PROVIDER',
  'UNKNOWN',
]);

const bodySchema = z.object({
  source_type: sourceTypeSchema,
  accountable_party_type: accountablePartySchema,
  accountable_party_name: z.string().trim().max(240).optional().nullable(),
  override_reason: z.string().trim().min(3).max(2000),
  actor_name: z.string().trim().max(240).optional().nullable(),
});

async function loadExternalTicketId(client: any, claimId: string, merchantId: string): Promise<string | null> {
  const { data } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('source_ticket_id,source_tickets(external_id)')
    .eq('id', claimId)
    .eq('merchant_id', merchantId)
    .maybeSingle();
  const ticket = Array.isArray(data?.source_tickets) ? data?.source_tickets[0] : data?.source_tickets;
  return typeof ticket?.external_id === 'string' ? ticket.external_id : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid loss source override payload' }, { status: 400 });

  const { id } = await params;
  const { data: source, error: loadError } = await serviceClient
    .from(TABLES.LOSS_SOURCES as any)
    .select('id,claim_id,merchant_id,source_type,accountable_party_type,accountable_party_name,evidence_summary')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: 'Loss source not found' }, { status: 404 });

  const summary = [
    source.evidence_summary,
    `Override: ${parsed.data.override_reason}`,
  ].filter(Boolean).join('\n');
  const { data: updated, error: updateError } = await serviceClient
    .from(TABLES.LOSS_SOURCES as any)
    .update({
      source_type: parsed.data.source_type,
      accountable_party_type: parsed.data.accountable_party_type,
      accountable_party_name: parsed.data.accountable_party_name ?? null,
      confidence: 'HIGH',
      evidence_summary: summary,
    })
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .select('*')
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: eventError } = await serviceClient.from(TABLES.ACCOUNTABILITY_EVENTS as any).insert({
    claim_id: source.claim_id,
    merchant_id: ctx.merchantId,
    loss_source_id: source.id,
    event_type: 'OVERRIDE_RECORDED',
    actor_type: 'MANAGER',
    actor_name: parsed.data.actor_name ?? user.email ?? null,
    description: `Loss source overridden from ${source.source_type} to ${parsed.data.source_type}.`,
    metadata: {
      previous_source_type: source.source_type,
      previous_accountable_party_type: source.accountable_party_type,
      previous_accountable_party_name: source.accountable_party_name,
      next_source_type: parsed.data.source_type,
      next_accountable_party_type: parsed.data.accountable_party_type,
      next_accountable_party_name: parsed.data.accountable_party_name ?? null,
      override_reason: parsed.data.override_reason,
    },
  });
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  await appendClaimEvent(serviceClient, {
    claim_id: source.claim_id,
    merchant_id: ctx.merchantId,
    event_type: 'note_added',
    note: `Loss source override: ${source.source_type} -> ${parsed.data.source_type}. ${parsed.data.override_reason}`,
    actor_user_id: user.id,
    triggered_by: 'loss_source_override',
    metadata: {
      loss_source_id: source.id,
      previous_source_type: source.source_type,
      next_source_type: parsed.data.source_type,
    },
  });

  const externalTicketId = await loadExternalTicketId(serviceClient, source.claim_id, ctx.merchantId);
  const writeback = await writeAccountabilityNoteToGorgias({
    client: serviceClient,
    merchantId: ctx.merchantId,
    externalTicketId,
    tags: ['unauth_source_overridden', 'unauth_manager_review'],
    bodyText: [
      'UNAUTH LOSS SOURCE OVERRIDE',
      `Previous source: ${source.source_type}`,
      `New source: ${parsed.data.source_type}`,
      `Accountable party: ${parsed.data.accountable_party_type}`,
      parsed.data.accountable_party_name ? `Party name: ${parsed.data.accountable_party_name}` : null,
      `Reason: ${parsed.data.override_reason}`,
    ].filter((line): line is string => Boolean(line)).join('\n'),
  });

  return NextResponse.json({ ok: true, loss_source: updated, writeback });
}
