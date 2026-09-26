import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';
import { loadIntelligenceReport, normalizeReportTimezone, REPORT_RANGES } from '@/lib/reporting/intelligence';
import { isNamedReportId } from '@/lib/reporting/namedReportContracts';
import { reportRunScopeHash, scopeIntelligenceReport, type ReportRunScope } from '@/lib/reporting/reportRuns';

const bodySchema = z.object({
  reportId: z.string(),
  range: z.enum(REPORT_RANGES),
  timezone: z.string().trim().min(1).max(79),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).nullable(),
  measure: z.enum(['amount', 'count']),
});

function failed(error: string, status: number, code: string) {
  return NextResponse.json({ error, code, writesPerformed: 0, deliveryEnabled: false }, { status });
}

export async function POST(request: Request) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return failed('Unauthorized', 401, 'unauthorized');
  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return failed('A valid Idempotency-Key header is required.', 400, 'idempotency_key_required');
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isNamedReportId(parsed.data?.reportId ?? '')) {
    return failed('Invalid report-run payload.', 400, 'invalid_report_run');
  }

  const service = createServiceClient();
  const permission = await requirePermission(service, user.id, PERMISSIONS.VIEW_AUDIT);
  if (permission.denied || !permission.ctx) return permission.denied ?? failed('Forbidden', 403, 'forbidden');
  if (!(await merchantHasEntitlement(service, permission.ctx.merchantId, 'REPORTS_ADVANCED'))) {
    return failed('Advanced reports are not available on this plan.', 403, 'reports_advanced_required');
  }

  const timezone = normalizeReportTimezone(parsed.data.timezone);
  const loaded = await loadIntelligenceReport(service, permission.ctx.merchantId, parsed.data.range, timezone);
  const availableCurrencies = new Set(loaded.bridges.map((bridge) => bridge.currency));
  if (parsed.data.currency && !availableCurrencies.has(parsed.data.currency)) {
    return failed('The selected currency is unavailable in this report scope.', 409, 'currency_unavailable');
  }
  const snapshot = scopeIntelligenceReport(loaded, parsed.data.currency);
  const scope: ReportRunScope = {
    range: parsed.data.range,
    timezone,
    currency: parsed.data.currency,
    measure: parsed.data.measure,
  };
  const rpc = await (service as any).rpc('record_report_run_snapshot', {
    p_merchant_id: permission.ctx.merchantId,
    p_actor_user_id: user.id,
    p_report_definition_id: parsed.data.reportId,
    p_scope: scope,
    p_snapshot: snapshot,
    p_record_count: snapshot.recordCount,
    p_generated_at: snapshot.generatedAt,
    p_idempotency_key: idempotencyKey,
  });
  if (rpc.error) {
    const notBuilt = /record_report_run_snapshot|schema cache|function .* does not exist/i.test(rpc.error.message ?? '');
    return failed(
      notBuilt ? 'Immutable report runs are not built on this database.' : 'The report run was not recorded.',
      503,
      notBuilt ? 'report_runs_not_built' : 'report_run_failed',
    );
  }
  const result = rpc.data && typeof rpc.data === 'object' ? rpc.data as Record<string, unknown> : {};
  return NextResponse.json({
    run: result.run ?? null,
    scopeHash: reportRunScopeHash(scope),
    auditReceipt: result.auditReceipt ?? null,
    replayed: result.replayed === true,
    writesPerformed: Number(result.writesPerformed ?? 1),
    deliveryEnabled: false,
  });
}
