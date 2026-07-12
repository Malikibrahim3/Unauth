import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { buildClaimOpsMetrics } from '@/lib/claims/reporting';
import { TABLES } from '@/lib/supabase/tables';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

type ClaimExportRow = {
  id: string;
  status: string;
  amount_at_risk: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type OutcomeExportRow = {
  claim_id: string;
  decision: string | null;
  outcome: string | null;
  amount_refunded: number | null;
  amount_recovered: number | null;
  recommended_payout_action: string | null;
  followed_recommendation: boolean | null;
  decided_at: string | null;
  updated_at: string | null;
};

type FinancialExportRow = {
  support_payout_case_id: string;
  currency: string;
  paid_minor: number;
  recovered_minor: number;
};

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) return denied;

  const exportDenied = await requirePermission(serviceClient, user.id, PERMISSIONS.EXPORT_AUDIT);
  if (exportDenied.denied) return exportDenied.denied;

  const range = request.nextUrl.searchParams.get('range') ?? '30d';
  const view = request.nextUrl.searchParams.get('view') ?? 'metrics';
  const cutoff = range === 'all'
    ? null
    : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 86400000).toISOString();

  let claimsQuery = serviceClient
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  if (cutoff) claimsQuery = claimsQuery.gte('submitted_at', cutoff);
  const { data: claims } = await claimsQuery;
  const claimRows = (claims ?? []) as ClaimExportRow[];
  // claim_outcomes is one-row-per-claim (claim_id UNIQUE) — fetch directly by claim id.
  const { data: outcomes } = claimRows.length > 0
    ? await serviceClient
      .from('claim_outcomes')
      .select('claim_id,decision,outcome,amount_refunded,amount_recovered,recommended_payout_action,followed_recommendation,decided_at,updated_at')
      .in('claim_id', claimRows.map((claim) => claim.id))
    : { data: [] as OutcomeExportRow[] };
  const { data: financialSummaries } = claimRows.length > 0
    ? await serviceClient
      .from(TABLES.CASE_FINANCIAL_SUMMARIES)
      .select('support_payout_case_id,currency,paid_minor,recovered_minor')
      .eq('merchant_id', ctx.merchantId)
      .in('support_payout_case_id', claimRows.map((claim) => claim.id))
    : { data: [] };
  const financialByCase = new Map<string, FinancialExportRow>(
    ((financialSummaries ?? []) as FinancialExportRow[]).map((row) => [row.support_payout_case_id, row]),
  );
  const projectedOutcomes = (outcomes ?? []).map((row: OutcomeExportRow) => {
    const financial = financialByCase.get(row.claim_id);
    return {
      ...row,
      amount_refunded: financial ? financial.paid_minor / 100 : 0,
      amount_recovered: financial ? financial.recovered_minor / 100 : 0,
    };
  });

  if (view === 'outcomes') {
    const claimStatusById = new Map(claimRows.map((claim) => [claim.id, claim.status]));
    const csv = [
      ['claim_id', 'status', 'decision', 'outcome', 'amount_refunded', 'amount_recovered', 'recommended_payout_action', 'followed_recommendation', 'decided_at'].join(','),
      ...projectedOutcomes.map((row: OutcomeExportRow) => [
        row.claim_id,
        claimStatusById.get(row.claim_id) ?? '',
        row.decision ?? '',
        row.outcome ?? '',
        row.amount_refunded ?? '',
        row.amount_recovered ?? '',
        row.recommended_payout_action ?? '',
        row.followed_recommendation ?? '',
        row.decided_at ?? row.updated_at ?? '',
      ].map(csvCell).join(',')),
    ].join('\n');

    logAction({
      ctx,
      action: 'export_audit',
      resourceType: 'report',
      metadata: { view: 'outcomes', range, rowCount: projectedOutcomes.length },
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="claims-outcomes-${range}.csv"`,
      },
    });
  }

  const metrics = buildClaimOpsMetrics(claimRows, projectedOutcomes);
  const rows = Object.entries(metrics).map(([metric, value]) => [metric, value]);
  const csv = [['metric', 'value'], ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  logAction({
    ctx,
    action: 'export_audit',
    resourceType: 'report',
    metadata: { view: 'metrics', range, rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="claims-operations-${range}.csv"`,
    },
  });
}
