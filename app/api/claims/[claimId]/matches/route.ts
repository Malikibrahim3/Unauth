import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { getReconciliationReadModel, refreshCaseReconciliation } from '@/lib/reconciliation/caseStore';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type MatchBody = {
  source_order_line_id?: unknown;
  quantity?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }

  const sourceOrderId = loaded.claim.source_order_id ?? null;
  const [lineResult, itemResult, reconciliation] = await Promise.all([
    sourceOrderId
      ? auth.service
        .from(TABLES.SOURCE_ORDER_LINES)
        .select('id,external_id,sku,variant_ref,title,quantity,unit_price_minor,total_minor,currency')
        .eq('merchant_id', auth.ctx.merchantId)
        .eq('source_order_id', sourceOrderId)
        .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    auth.service
      .from(TABLES.CASE_CLAIMED_ITEMS)
      .select('*')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .order('created_at', { ascending: true }),
    getReconciliationReadModel(auth.service, auth.ctx.merchantId, claimId),
  ]);
  if (lineResult.error) {
    return NextResponse.json({ error: 'Could not load order line candidates.' }, { status: 500 });
  }
  if (itemResult.error) {
    return NextResponse.json({ error: 'Could not load claimed items.' }, { status: 500 });
  }

  return NextResponse.json({
    case_version: loaded.claim.state_version ?? 1,
    order_lines: lineResult.data ?? [],
    claimed_items: itemResult.data ?? [],
    reconciliation,
    permissions: { can_mutate: true },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }
  if (!idempotencyKeyFrom(request)) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as MatchBody | null;
  const sourceOrderLineId = text(body?.source_order_line_id);
  const quantity = asPositiveInteger(body?.quantity ?? 1);
  if (!sourceOrderLineId || !quantity) {
    return NextResponse.json(
      { error: 'source_order_line_id and a positive quantity are required.' },
      { status: 400 },
    );
  }
  if (!loaded.claim.source_order_id) {
    return NextResponse.json({ error: 'The case has no confirmed source order.' }, { status: 422 });
  }

  const { data: line, error: lineError } = await auth.service
    .from(TABLES.SOURCE_ORDER_LINES)
    .select('id,sku,variant_ref,title,quantity,source_order_id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('source_order_id', loaded.claim.source_order_id)
    .eq('id', sourceOrderLineId)
    .maybeSingle();
  if (lineError) return NextResponse.json({ error: 'Could not validate the order line.' }, { status: 500 });
  if (!line) return NextResponse.json({ error: 'Order line is not part of this case order.' }, { status: 422 });
  const availableQuantity = Number(line.quantity ?? 0);
  if (Number.isFinite(availableQuantity) && availableQuantity > 0 && quantity > availableQuantity) {
    return NextResponse.json(
      { error: 'Claimed quantity cannot exceed the source order line quantity.' },
      { status: 422 },
    );
  }

  const existingResult = await auth.service
    .from(TABLES.CASE_CLAIMED_ITEMS)
    .select('*')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('support_payout_case_id', claimId)
    .eq('source_order_line_id', sourceOrderLineId)
    .maybeSingle();
  if (existingResult.error) return NextResponse.json({ error: 'Could not check the existing item match.' }, { status: 500 });
  if (existingResult.data) {
    const reconciliation = await refreshCaseReconciliation(auth.service, auth.ctx.merchantId, claimId);
    return NextResponse.json({ item: existingResult.data, reconciliation, already_exists: true });
  }

  const { data: item, error: insertError } = await auth.mutationClient
    .from(TABLES.CASE_CLAIMED_ITEMS)
    .insert({
      merchant_id: auth.ctx.merchantId,
      support_payout_case_id: claimId,
      source_order_line_id: sourceOrderLineId,
      claimed_sku: line.sku ?? null,
      claimed_variant_ref: line.variant_ref ?? null,
      claimed_title: line.title ?? null,
      claimed_quantity: quantity,
      extraction_method: 'agent_selected',
      match_status: 'confirmed',
      match_method: 'order_line_exact',
      match_confidence: 1,
      confirmed_by: auth.user.id,
      confirmed_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertError) {
    return NextResponse.json({ error: 'Could not save the item match.' }, { status: 500 });
  }

  const reconciliation = await refreshCaseReconciliation(auth.service, auth.ctx.merchantId, claimId);
  return NextResponse.json({ item, reconciliation }, { status: 201 });
}
