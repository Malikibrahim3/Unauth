import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import type { IdentityCatchEvent } from '@/lib/catches/types';
import type { ConfidenceGrade } from '@/lib/engine/weights';

type CatchRow = {
  id: string;
  merchant_id: string;
  claim_id: string | null;
  order_id: string | null;
  profile_id: string | null;
  submitted_identifier_display: string | null;
  linked_identifier_display: string | null;
  matched_signal_types: string[] | null;
  confidence_score: number | null;
  confidence_grade: string | null;
  estimated_exposure_amount: number | null;
  estimated_exposure_currency: string | null;
  evidence_pack_id: string | null;
  created_at: string;
};

function mapRow(row: CatchRow): IdentityCatchEvent {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    claimId: row.claim_id,
    orderId: row.order_id,
    profileId: row.profile_id,
    submittedIdentifierDisplay: row.submitted_identifier_display,
    linkedIdentifierDisplay: row.linked_identifier_display,
    matchedSignalTypes: row.matched_signal_types ?? [],
    confidenceScore: row.confidence_score ?? 0,
    confidenceGrade: (row.confidence_grade ?? 'weak') as ConfidenceGrade,
    estimatedExposureAmount: row.estimated_exposure_amount,
    estimatedExposureCurrency: row.estimated_exposure_currency ?? 'GBP',
    evidencePackId: row.evidence_pack_id,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get('claimId');
  const limitParam = parseInt(searchParams.get('limit') ?? '10', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(1, limitParam), 50) : 10;

  let query = serviceClient
    .from(TABLES.IDENTITY_CATCH_EVENTS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (claimId) {
    query = query.eq('claim_id', claimId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CatchRow[];
  const events = rows.map(mapRow);
  return NextResponse.json(events);
}
