import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { appendClaimEvent } from '@/lib/claims/events';
import { writeAccountabilityNoteToGorgias } from '@/lib/claim-gate/writeBackToGorgias';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

const bodySchema = z.object({
  recovered_amount: z.number().finite().min(0).optional().default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
  external_reference: z.string().trim().max(240).optional().nullable(),
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
  if (!parsed.success) return NextResponse.json({ error: 'Invalid recovery task payload' }, { status: 400 });

  const { id } = await params;
  const { data: task, error: loadError } = await serviceClient
    .from(TABLES.RECOVERY_TASKS as any)
    .select('id,claim_id,loss_source_id,merchant_id,task_type,owner_type,status,amount_to_recover')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Recovery task not found' }, { status: 404 });

  const completedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await serviceClient
    .from(TABLES.RECOVERY_TASKS as any)
    .update({
      status: 'completed',
      external_reference: parsed.data.external_reference ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: completedAt,
    })
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .select('*')
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const eventRows = [
    {
      claim_id: task.claim_id,
      merchant_id: ctx.merchantId,
      loss_source_id: task.loss_source_id,
      recovery_task_id: task.id,
      event_type: 'TASK_COMPLETED',
      actor_type: 'HUMAN_AGENT',
      actor_name: user.email ?? null,
      description: `Recovery task completed: ${task.task_type}.`,
      metadata: {
        recovered_amount: parsed.data.recovered_amount,
        external_reference: parsed.data.external_reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    },
  ];
  if (parsed.data.recovered_amount > 0) {
    eventRows.push({
      claim_id: task.claim_id,
      merchant_id: ctx.merchantId,
      loss_source_id: task.loss_source_id,
      recovery_task_id: task.id,
      event_type: 'MONEY_RECOVERED',
      actor_type: 'HUMAN_AGENT',
      actor_name: user.email ?? null,
      description: `Recovered ${parsed.data.recovered_amount}.`,
      metadata: {
        recovered_amount: parsed.data.recovered_amount,
        external_reference: parsed.data.external_reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
  }

  const { error: eventError } = await serviceClient.from(TABLES.ACCOUNTABILITY_EVENTS as any).insert(eventRows);
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  const { data: payoutCase } = await serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('currency,primary_currency')
    .eq('merchant_id', ctx.merchantId)
    .eq('id', task.claim_id)
    .maybeSingle();
  const recoveryCurrency = payoutCase?.primary_currency ?? payoutCase?.currency ?? null;
  if (parsed.data.recovered_amount > 0 && recoveryCurrency) {
    await recordDomainEvent(serviceClient, {
      merchantId: ctx.merchantId,
      eventType: 'recovery.completed',
      aggregateType: 'case',
      aggregateId: task.claim_id,
      idempotencyKey: `recovery-task:${task.id}:completed`,
      payload: {
        recovery_task_id: task.id,
        amount_minor: Math.round(parsed.data.recovered_amount * 100),
        currency: recoveryCurrency,
      },
      actorType: 'user',
      actorId: user.id,
      handlers: ['financialProjection', 'customerProjection', 'caseProjection', 'notificationProjection'],
    });
  }

  await appendClaimEvent(serviceClient, {
    claim_id: task.claim_id,
    merchant_id: ctx.merchantId,
    event_type: 'outcome_added',
    note: parsed.data.recovered_amount > 0
      ? `Recovery task completed. Recovered ${parsed.data.recovered_amount}.`
      : 'Recovery task completed.',
    actor_user_id: user.id,
    triggered_by: 'recovery_task_complete',
    metadata: {
      recovery_task_id: task.id,
      recovered_amount: parsed.data.recovered_amount,
      external_reference: parsed.data.external_reference ?? null,
    },
  });

  const externalTicketId = await loadExternalTicketId(serviceClient, task.claim_id, ctx.merchantId);
  const writeback = await writeAccountabilityNoteToGorgias({
    client: serviceClient,
    merchantId: ctx.merchantId,
    externalTicketId,
    tags: ['unauth_recovery_completed'],
    bodyText: [
      'UNAUTH RECOVERY UPDATE',
      `Task completed: ${task.task_type}`,
      `Recovered amount: ${parsed.data.recovered_amount}`,
      parsed.data.external_reference ? `External reference: ${parsed.data.external_reference}` : null,
      parsed.data.notes ? `Notes: ${parsed.data.notes}` : null,
    ].filter((line): line is string => Boolean(line)).join('\n'),
  });

  return NextResponse.json({ ok: true, recovery_task: updated, writeback });
}
