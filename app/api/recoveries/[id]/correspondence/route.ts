import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { getRecoveryCase } from '@/lib/recoveries/store';

const schema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['provider_api', 'gmail', 'outlook', 'gorgias', 'zendesk', 'intercom', 'slack', 'erp', 'wms', 'marketplace_portal_api', 'payment_processor_api']),
  sourceProvider: z.string().trim().min(1).max(80), sourceRecordId: z.string().trim().min(1).max(240),
  subject: z.string().trim().max(500).nullable().optional(), sourceUrl: z.string().url().nullable().optional(),
  occurredAt: z.string().datetime(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient(); const { data: { user } } = await auth.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS); if (denied) return denied;
  const { id } = await params; const recovery = await getRecoveryCase(client, ctx.merchantId, id); if (!recovery) return NextResponse.json({ error: 'Recovery not found' }, { status: 404 });
  if (!recovery.loss_case_id) return NextResponse.json({ error: 'Recovery must be linked to a loss before correspondence can be recorded.' }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Invalid correspondence', issues: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data; const { data, error } = await client.from(TABLES.EXTERNAL_CORRESPONDENCE).insert({ merchant_id: ctx.merchantId, loss_case_id: recovery.loss_case_id, direction: input.direction, channel: input.channel, source_provider: input.sourceProvider, source_record_id: input.sourceRecordId, subject: input.subject ?? null, source_url: input.sourceUrl ?? null, sent_at: input.direction === 'outbound' ? input.occurredAt : null, received_at: input.direction === 'inbound' ? input.occurredAt : null, counterparty_type: recovery.owner_type.startsWith('merchant_') ? 'internal_team' : 'unknown', counterparty_name: recovery.partner?.name ?? null, body_hash: null, extraction_status: 'not_required', extracted_facts_json: { recorded_by: user.id }, matched_confidence: 1 }).select('id,direction,channel,source_provider,source_record_id,subject,sent_at,received_at').single();
  if (error) return NextResponse.json({ error: 'Could not record correspondence' }, { status: 500 });
  await client.from(TABLES.RECOVERY_CASE_EVENTS).insert({ merchant_id: ctx.merchantId, recovery_case_id: id, event_type: 'status_changed', from_status: recovery.status, to_status: recovery.status, note: input.subject ?? 'External correspondence recorded', metadata: { correspondence_id: data.id, direction: input.direction, actor_user_id: user.id } });
  return NextResponse.json({ correspondence: data }, { status: 201 });
}
