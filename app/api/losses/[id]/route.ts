import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { getLossReadModel } from '@/lib/losses/readModel';

const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_recoverability'), recoverability: z.enum(['recoverable', 'possibly_recoverable', 'not_recoverable', 'needs_more_evidence']), rationale: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal('assign_owner'), ownerUserId: z.string().uuid().nullable(), rationale: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal('confirm_attribution'), candidateId: z.string().uuid(), rationale: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal('write_off'), rationale: z.string().trim().min(1).max(2000), idempotencyKey: z.string().trim().min(8).max(200) }),
]);

async function context(permission: typeof PERMISSIONS.VIEW_INBOX | typeof PERMISSIONS.SUBMIT_PAYOUT_DECISIONS) {
  const auth = createClient(); const { data: { user } } = await auth.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, client: null, ctx: null };
  const client = createServiceClient(); const access = await requirePermission(client, user.id, permission);
  if (access.denied) return { response: access.denied, user: null, client: null, ctx: null };
  return { response: null, user, client, ctx: access.ctx };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await context(PERMISSIONS.VIEW_INBOX); if (auth.response) return auth.response;
  const { id } = await params; const model = await getLossReadModel(auth.client!, auth.ctx!.merchantId, id);
  return model ? NextResponse.json(model) : NextResponse.json({ error: 'Loss not found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await context(PERMISSIONS.SUBMIT_PAYOUT_DECISIONS); if (auth.response) return auth.response;
  const { id } = await params; const model = await getLossReadModel(auth.client!, auth.ctx!.merchantId, id);
  if (!model) return NextResponse.json({ error: 'Loss not found' }, { status: 404 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid loss action', issues: parsed.error.flatten() }, { status: 400 });
  const client = auth.client!; const merchantId = auth.ctx!.merchantId; const input = parsed.data;
  let patch: Record<string, unknown> = {};
  if (input.action === 'set_recoverability') patch = { recoverability: input.recoverability };
  if (input.action === 'assign_owner') patch = { owner_user_id: input.ownerUserId };
  if (input.action === 'confirm_attribution') {
    const candidate = model.attributionCandidates.find((item) => item.id === input.candidateId);
    if (!candidate) return NextResponse.json({ error: 'Attribution candidate not found' }, { status: 404 });
    patch = { attribution: candidate.attribution, counterparty_type: candidate.accountable_party_type, counterparty_name: candidate.accountable_party_name, attribution_confidence: candidate.confidence };
  }
  if (input.action === 'write_off') {
    if (model.loss.written_off_at) return NextResponse.json({ error: 'Loss is already written off.' }, { status: 409 });
    if (model.amounts.length === 0) return NextResponse.json({ error: 'A reconciled financial summary is required before write-off.' }, { status: 409 });
    const { data: prior } = await client.from(TABLES.CASE_FINANCIAL_ENTRIES).select('id').eq('merchant_id', merchantId).eq('loss_case_id', id).eq('state', 'written_off').contains('metadata', { idempotency_key: input.idempotencyKey }).maybeSingle();
    if (!prior) {
      const amount = model.amounts.reduce((total, item) => total + item.outstandingRecoveryMinor, 0);
      const currency = model.amounts.length === 1 ? model.amounts[0].currency : model.loss.currency;
      if (model.amounts.length > 1) return NextResponse.json({ error: 'Mixed-currency loss must be written off per currency.' }, { status: 409 });
      const { error: ledgerError } = await client.from(TABLES.CASE_FINANCIAL_ENTRIES).insert({ merchant_id: merchantId, support_payout_case_id: model.loss.support_payout_case_id, loss_case_id: id, state: 'written_off', amount_minor: amount, currency, direction: 'debit', metadata: { idempotency_key: input.idempotencyKey, rationale: input.rationale, actor_user_id: auth.user!.id } });
      if (ledgerError) return NextResponse.json({ error: 'Could not record write-off' }, { status: 500 });
    }
    patch = { status: 'closed_unrecoverable', written_off_at: new Date().toISOString() };
  }
  const { error: updateError } = await client.from(TABLES.LOSS_CASES).update(patch).eq('merchant_id', merchantId).eq('id', id);
  if (updateError) return NextResponse.json({ error: 'Could not update loss' }, { status: 500 });
  await client.from(TABLES.LOSS_CASE_EVENTS).insert({ merchant_id: merchantId, loss_case_id: id, event_type: input.action === 'write_off' ? 'case_closed' : 'status_synced', metadata_json: { action: input.action, rationale: input.rationale, actor_user_id: auth.user!.id, before: model.loss, patch } });
  return NextResponse.json({ ok: true, loss: await getLossReadModel(client, merchantId, id) });
}
