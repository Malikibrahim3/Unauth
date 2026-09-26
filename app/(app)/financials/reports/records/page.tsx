import Link from '@/components/navigation/AppNavLink';
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  isFinancialReportMetric,
  normalizeReportTimezone,
  parseReportRange,
  REPORT_DEFINITIONS,
  reportCutoff,
} from "@/lib/reporting/intelligence";
import { financialStageDefinition, label } from "@/lib/ui/labels";
import { entityLabel, financialStageLabel as copyFinancialStageLabel, TIME_RANGE_LABELS } from "@/lib/ui/merchantCopy";
import { shortRef, hashId } from "@/lib/ui/displayRef";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import {
  formatCurrencyNullable,
  formatDateTime,
  formatMinorCurrencyNullable,
  formatNumber,
} from "@/lib/utils/format";
import { ReportRecordActions } from '@/components/reports/ReportRecordActions';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { resolveAnalyticsScope } from "@/lib/analytics/server/scope";
import { getFinancialAnalyticsRecords } from "@/lib/analytics/server/rpc";
import { delayForAcceptanceScenario, throwForAcceptanceScenario } from "@/lib/testing/acceptanceStateInjector";
export const dynamic = "force-dynamic";

type ReportRecordRow = {
  id: string;
  status: string | null;
  recordType: string | null;
  currency: string | null;
  amountMinor: number | null;
  amountMajor: number | null;
  updatedAt: string | null;
  caseId?: string | null;
  lossId?: string | null;
  recoveryId?: string | null;
  reversalOf?: string | null;
};

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';
const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function stateStyle(value: string | null) {
  const normalized = value?.toLowerCase() ?? 'unavailable';
  if (/(confirm|recover|paid|complete|matched|settled|approved)/.test(normalized)) return { background: '#eef6f1', color: '#1a6b43' };
  if (/(fail|reject|cancel|error)/.test(normalized)) return { background: '#fdf0e6', color: '#b0431a' };
  if (/(written|closed|unavailable)/.test(normalized)) return { background: '#f4f3f1', color: '#40454a' };
  return { background: '#fff3e9', color: '#7a5310' };
}

function displayState(value: string | null) {
  return value ? value.replaceAll('_', ' ').toUpperCase() : 'UNAVAILABLE';
}

export default async function ReportRecords({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_AUDIT,
  );
  if (denied) redirect(await resolveDefaultAppPath(svc, user.id));
  if (!(await merchantHasEntitlement(svc, ctx.merchantId, "REPORTS_ADVANCED")))
    redirect("/settings/billing?required=REPORTS_ADVANCED");
  await delayForAcceptanceScenario("reports-and-records-loading");
  await throwForAcceptanceScenario("report-records-error");
  const reportDefinition = REPORT_DEFINITIONS.find((definition) => definition.id === sp.reportId) ?? null;
  const reportId = reportDefinition?.id ?? null;
  const exactLedgerDrilldown = sp.kind === "financial-entry";
  const kind = sp.kind === "recovery" || (!sp.kind && reportId === 'recovery') ? "recovery" : "case";
  const dimension =
    kind === "case" && sp.dimension === "financial"
      ? "financial"
      : kind === "case" && sp.dimension === "category"
        ? "category"
        : sp.dimension === "reason"
          ? "reason"
          : !sp.dimension && ['financial', 'loss-causes', 'prevention'].includes(reportId ?? '')
            ? "financial"
            : "status";
  const value = (sp.value || "").slice(0, 100);
  const bareCaseScope = !exactLedgerDrilldown
    && kind === "case"
    && !reportDefinition
    && !sp.kind
    && !sp.dimension
    && !sp.metric
    && !value;
  const requestedMetric = exactLedgerDrilldown ? sp.measure ?? "" : sp.metric ?? "";
  const reportMetric = reportId === 'loss-causes' ? 'confirmed_loss' : reportId === 'prevention' ? 'prevented' : reportId === 'recovery' ? 'recovered' : 'exposed';
  const metric = isFinancialReportMetric(requestedMetric)
    ? requestedMetric
    : dimension === "category"
      ? "confirmed_loss"
      : reportMetric;
  const range = parseReportRange(sp.range);
  const timezone = normalizeReportTimezone(sp.timezone);
  const cutoff = reportCutoff(range);
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSizeCandidate = Number(sp.pageSize);
  const pageSize = [25, 50, 100].includes(pageSizeCandidate) ? pageSizeCandidate : 50;
  const from = (page - 1) * pageSize;
  const search = (sp.search ?? '').trim().slice(0, 100);
  const sort = ['updated_asc', 'amount_desc', 'amount_asc'].includes(sp.sort ?? '') ? sp.sort! : 'updated_desc';
  let rows: ReportRecordRow[] = [];
  let total = 0;
  let loadFailed = false;
  let exactScopeUnavailable = false;
  let exactSignedTotalMinor: number | null = null;
  let exactScope: ReturnType<typeof resolveAnalyticsScope> | null = null;

  if (exactLedgerDrilldown) {
    const exactCurrency = sp.currency?.trim().toUpperCase() ?? '';
    try {
      if (!isFinancialReportMetric(requestedMetric) || ['outstanding', 'final_net_loss'].includes(requestedMetric) || !sp.from || !sp.to || !sp.asOf || !/^[A-Z]{3}$/.test(exactCurrency)) {
        throw new Error('exact_ledger_scope_invalid');
      }
      exactScope = resolveAnalyticsScope({
        range: 'custom',
        start: sp.from,
        end: sp.to,
        timezone,
        currency: exactCurrency,
      }, { asOf: new Date(sp.asOf) });
    } catch {
      loadFailed = true;
      exactScopeUnavailable = true;
    }

    if (exactScope) {
      try {
        const result = await getFinancialAnalyticsRecords(
          { client: svc, merchantId: ctx.merchantId, actorId: user.id },
          { scope: exactScope, measure: requestedMetric, page, pageSize },
        );
        total = result.data.totalCount;
        exactSignedTotalMinor = result.data.signedTotalMinor;
        rows = result.data.records.map((entry) => ({
          id: entry.id,
          status: entry.state,
          recordType: entry.reversesEntryId ? 'reversal' : 'ledger_entry',
          currency: entry.currency,
          amountMinor: entry.amountMinor,
          amountMajor: null,
          updatedAt: entry.effectiveAt,
          caseId: entry.caseId,
          lossId: entry.lossId,
          recoveryId: entry.recoveryId,
          reversalOf: entry.reversesEntryId,
        }));
      } catch {
        loadFailed = true;
      }
    }
  } else if (dimension === "financial" || dimension === "category") {
    const result = await svc.rpc("get_financial_report_records", {
      p_merchant_id: ctx.merchantId,
      p_cutoff: cutoff,
      p_currency: sp.currency?.toUpperCase() ?? null,
      p_metric: metric,
      p_category: dimension === "category" && value ? value : null,
      p_limit: pageSize,
      p_offset: from,
    });
    loadFailed = Boolean(result.error);
    const financialRows = (result.data ?? []) as Array<{
      support_payout_case_id: string;
      case_status: string | null;
      claim_type: string | null;
      currency: string | null;
      amount_minor: number | null;
      updated_at: string | null;
      total_count: number | null;
    }>;
    total = Number(financialRows[0]?.total_count ?? 0);
    rows = financialRows.map((row) => ({
      id: row.support_payout_case_id,
      status: row.case_status,
      recordType: row.claim_type,
      currency: row.currency,
      amountMinor: row.amount_minor,
      amountMajor: null,
      updatedAt: row.updated_at,
    }));
    if (sp.from) rows = rows.filter((row) => row.updatedAt && row.updatedAt >= sp.from!);
    if (sp.to) rows = rows.filter((row) => row.updatedAt && row.updatedAt < sp.to!);
    if (sp.from || sp.to) total = rows.length;
    if (search) {
      const normalized = search.toLowerCase();
      rows = rows.filter((row) => [row.id, row.status, row.recordType, row.currency].filter(Boolean).join(' ').toLowerCase().includes(normalized));
    }
  } else {
    let query =
      kind === "recovery"
        ? svc
            .from(TABLES.RECOVERY_CASES)
            .select(
              "id,status,recovery_type,currency,amount_recovered_minor,updated_at",
              { count: "exact" },
            )
            .eq("merchant_id", ctx.merchantId)
        : svc
            .from(TABLES.MERCHANT_CLAIMS)
            .select(
              "id,status,claim_type,reason_normalized,currency,amount_at_risk,submitted_at,updated_at",
              { count: "exact" },
            )
            .eq("merchant_id", ctx.merchantId);
    if (value)
      query =
        kind === "recovery" || dimension === "status"
          ? query.eq("status", value)
          : query.or(`reason_normalized.eq.${value},claim_type.eq.${value}`);
    if (cutoff)
      query = query.gte(
        kind === "recovery" ? "updated_at" : "submitted_at",
        cutoff,
      );
    if (sp.currency) query = query.eq("currency", sp.currency.toUpperCase());
    const orderColumn = sort.startsWith('amount')
      ? kind === 'recovery' ? 'amount_recovered_minor' : 'amount_at_risk'
      : 'updated_at';
    const result = await query
      .order(orderColumn, { ascending: sort.endsWith('_asc') })
      .range(from, from + pageSize - 1);
    loadFailed = Boolean(result.error);
    total = result.count ?? 0;
    rows = ((result.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      status: typeof row.status === "string" ? row.status : null,
      recordType:
        typeof row.recovery_type === "string"
          ? row.recovery_type
          : dimension === "reason" && typeof row.reason_normalized === "string"
            ? row.reason_normalized
            : typeof row.claim_type === "string"
              ? row.claim_type
              : null,
      currency: typeof row.currency === "string" ? row.currency : null,
      amountMinor:
        typeof row.amount_recovered_minor === "number"
          ? row.amount_recovered_minor
          : null,
      amountMajor:
        typeof row.amount_at_risk === "number" ? row.amount_at_risk : null,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    }));
    if (search) {
      const normalized = search.toLowerCase();
      rows = rows.filter((row) => [row.id, row.status, row.recordType, row.currency].filter(Boolean).join(' ').toLowerCase().includes(normalized));
    }
  }

  if (!exactLedgerDrilldown && (dimension === 'financial' || dimension === 'category')) {
    rows = rows.toSorted((left, right) => {
      if (sort.startsWith('amount')) {
        const leftAmount = left.amountMinor ?? Number.NEGATIVE_INFINITY;
        const rightAmount = right.amountMinor ?? Number.NEGATIVE_INFINITY;
        return sort === 'amount_asc' ? leftAmount - rightAmount : rightAmount - leftAmount;
      }
      const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
      const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
      return sort === 'updated_asc' ? leftTime - rightTime : rightTime - leftTime;
    });
  }

  const financialLabelMap: Record<string, string> = {
    requested: copyFinancialStageLabel("requested"),
    exposed: copyFinancialStageLabel("maximum_exposure"),
    approved: copyFinancialStageLabel("merchant_decision"),
    paid: copyFinancialStageLabel("observed_payout"),
    estimated_loss: copyFinancialStageLabel("estimated_loss"),
    confirmed_loss: copyFinancialStageLabel("confirmed_loss"),
    recoverable: copyFinancialStageLabel("eligible_recovery"),
    recovered: copyFinancialStageLabel("recovered_cash"),
    prevented: copyFinancialStageLabel("prevented"),
    written_off: copyFinancialStageLabel("written_off"),
    outstanding: copyFinancialStageLabel("outstanding_recovery"),
    final_net_loss: copyFinancialStageLabel("final_net_loss"),
  };
  const titleValue = bareCaseScope
    ? "All states"
    : exactLedgerDrilldown
    ? financialLabelMap[metric] ?? copyFinancialStageLabel(metric)
    : reportDefinition
    ? reportDefinition.name
    : dimension === "financial"
      ? financialLabelMap[metric] ?? copyFinancialStageLabel(metric)
    : dimension === "category"
      ? label("lossCategory", value)
      : kind === "recovery"
        ? entityLabel("recovery")
        : label("caseStatus", value);
  const metricDefinition = exactLedgerDrilldown
    ? 'Immutable ledger entries whose state, currency, effective-time interval and recorded-at read boundary exactly match the selected chart cell.'
    : bareCaseScope
    ? 'All case records in the selected date range; no workflow-state filter is applied.'
    : reportDefinition
    ? reportDefinition.definition
    : dimension === "financial"
      ? financialStageDefinition(metric)
    : dimension === "category"
      ? "Records whose canonical loss category matches this report slice."
      : "Records whose current workflow state matches this report slice.";
  const reportHref = `/financials/reports?${new URLSearchParams({
    range,
    timezone,
    ...(reportId ? { report: reportId } : {}),
  }).toString()}`;
  const currentParams = new URLSearchParams();
  for (const [key, parameterValue] of Object.entries(sp)) {
    if (parameterValue) currentParams.set(key, parameterValue);
  }
  const recordsHref = (targetPage: number) => {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(targetPage));
    return `/financials/reports/records?${params.toString()}`;
  };
  const controlEntries = [...currentParams.entries()].filter(([key]) => !['search', 'sort', 'page', 'pageSize'].includes(key));
  const scopedResultCount = exactLedgerDrilldown && exactSignedTotalMinor != null
    ? `${formatNumber(total)} matching entries · signed total ${formatMinorCurrencyNullable(exactSignedTotalMinor, sp.currency?.toUpperCase())}`
    : search
    ? `${formatNumber(rows.length)} matching rows loaded on this page · ${formatNumber(total)} scoped records before search`
    : `${formatNumber(total)} matching records`;
  const recordHref = (row: ReportRecordRow) => exactLedgerDrilldown
    ? row.caseId ? `/cases/${row.caseId}` : row.recoveryId ? `/financials/recovery/${row.recoveryId}` : row.lossId ? `/financials/losses/${row.lossId}` : null
    : kind === "recovery" ? `/financials/recovery/${row.id}` : `/cases/${row.id}`;
  const exportParams = new URLSearchParams({ range, timezone, view: 'records' });
  if (sp.currency) exportParams.set('currency', sp.currency.toUpperCase());
  if (dimension === 'financial') exportParams.set('metric', metric);
  if (dimension === 'category') exportParams.set('category', value);
  const exportHref = !exactLedgerDrilldown && (dimension === 'financial' || dimension === 'category')
    ? `/api/reports/claims?${exportParams.toString()}`
    : null;
  const displayedMetric = exactLedgerDrilldown && exactSignedTotalMinor != null
    ? formatMinorCurrencyNullable(exactSignedTotalMinor, sp.currency?.toUpperCase())
    : titleValue;
  const periodLabel = exactScope
    ? `${formatDateTime(exactScope.start)} – ${formatDateTime(exactScope.end)}`
    : TIME_RANGE_LABELS[range];
  const currencyLabel = sp.currency?.toUpperCase() ? `${sp.currency.toUpperCase()} only` : 'Currencies separated';

  return <section data-screen-label="Report records" data-visual-world="supplied-package" data-surface-id="report-supporting-records" data-archetype="P5" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
    <SetBreadcrumbLabel label="Supporting records" detail={`metric: ${titleValue} · ${periodLabel} · ${currencyLabel} · ${formatNumber(total)} rows`} />
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: line }}><span style={{ color: '#64686d', font: `400 12.5px/1.5 ${sans}` }}>Every row behind <strong style={{ color: '#1c1f23', font: `400 13px/1.4 ${mono}` }}>{displayedMetric}</strong> — {loadFailed ? 'record read unavailable' : `${formatNumber(total)} immutable ${total === 1 ? 'entry' : 'entries'}`}, ordered by effective date.</span><span style={{ flex: 1 }}/><ReportRecordActions controlEntries={controlEntries} search={search} sort={sort} pageSize={pageSize} metricDefinition={metricDefinition} exportHref={exportHref} exportLabel={`Export these ${formatNumber(total)} rows`} filterDisabled={exactLedgerDrilldown}/></div>
    <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, borderRadius: 12, padding: '13px 16px', background: '#f4f3f1' }}><div style={{ flex: 1 }}><span style={{ display: 'block', marginBottom: 7, color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>METRIC</span><strong style={{ color: '#1c1f23', font: `500 13px/1.3 ${sans}` }}>{titleValue}</strong></div><div style={{ flex: 2, minWidth: 0 }}><span style={{ display: 'block', marginBottom: 7, color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>HOW IT IS DERIVED</span><span style={{ color: '#40454a', font: `400 11.5px/1.5 ${mono}` }}>{metricDefinition}</span></div><div style={{ flex: 'none' }}><span style={{ display: 'block', marginBottom: 7, color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>ROWS</span><span style={{ color: '#1c1f23', font: `400 13px/1.3 ${mono}` }}>{loadFailed ? '—' : formatNumber(total)}</span></div><div style={{ flex: 'none' }}><span style={{ display: 'block', marginBottom: 7, color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>EXCLUDED</span><span style={{ color: '#b0431a', font: `400 13px/1.3 ${mono}` }}>unavailable</span></div></section>
        <section aria-label="Matching report records" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, padding: '12px 16px 0', background: '#fff', boxShadow: shadow }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8 }}><span style={{ width: 96, flex: 'none', color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>RECORD</span><span style={{ width: 96, flex: 'none', color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>TYPE</span><span style={{ flex: 1, color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>CAUSE</span><span style={{ width: 80, flex: 'none', color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>{exactLedgerDrilldown ? 'EFFECTIVE' : 'UPDATED'}</span><span style={{ width: 92, flex: 'none', textAlign: 'right', color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>AMOUNT</span><span style={{ width: 104, flex: 'none', textAlign: 'right', color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${sans}` }}>STATE</span></header>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{loadFailed ? <div data-state-id="report-records-error" style={{ display: 'grid', minHeight: 180, placeItems: 'center', borderTop: '1px solid #f4f2ef', textAlign: 'center' }}><div><strong style={{ display: 'block', font: `500 13px/1.4 ${sans}` }}>These report records could not be loaded</strong><span style={{ display: 'block', maxWidth: 520, marginTop: 6, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{exactScopeUnavailable ? 'This chart cell does not carry a complete state, currency, effective-time interval and as-of boundary. No broader set has been substituted.' : 'The summary value has not been changed. Retry this same report scope.'}</span><Link href={recordsHref(page)} style={{ display: 'inline-block', marginTop: 9, color: '#9b470d', font: `500 11px/1.5 ${sans}` }}>Retry records</Link></div></div> : rows.length === 0 ? <div data-state-id="report-records-empty" style={{ display: 'grid', minHeight: 180, placeItems: 'center', borderTop: '1px solid #f4f2ef', textAlign: 'center' }}><div><strong style={{ display: 'block', font: `500 13px/1.4 ${sans}` }}>{exactLedgerDrilldown ? 'No immutable entries match this chart cell' : 'No records match this report slice'}</strong><span style={{ display: 'block', maxWidth: 520, marginTop: 6, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{search ? 'No matching supporting row was loaded on this page. Clear search or continue through the scoped pages; this is not presented as a global zero.' : 'Choose another report range or return to the report to inspect a different metric.'}</span><Link href={reportHref} style={{ display: 'inline-block', marginTop: 9, color: '#9b470d', font: `500 11px/1.5 ${sans}` }}>Back to report</Link></div></div> : rows.map((row) => {
            const href = recordHref(row);
            const recordLabel = exactLedgerDrilldown ? `ENTRY-${hashId(row.id)}` : kind === 'recovery' ? `REC-${hashId(row.id)}` : shortRef(null, row.id);
            const type = exactLedgerDrilldown ? row.reversalOf ? 'Reversal entry' : 'Ledger entry' : kind === 'recovery' ? label('attribution', row.recordType) : dimension === 'reason' ? row.recordType ?? '—' : label('claimType', row.recordType);
            const state = exactLedgerDrilldown ? copyFinancialStageLabel(row.status ?? 'unknown') : label(kind === 'recovery' ? 'recoveryStatus' : 'caseStatus', row.status);
            const stateTone = stateStyle(row.status);
            const amount = row.amountMinor != null ? formatMinorCurrencyNullable(row.amountMinor, row.currency) : row.amountMajor != null ? formatCurrencyNullable(row.amountMajor, row.currency) : '—';
            return <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}>{href ? <Link href={href} style={{ width: 96, flex: 'none', color: '#9b470d', textDecoration: 'none', font: `400 11.5px/1.4 ${mono}` }}>{recordLabel}</Link> : <span style={{ width: 96, flex: 'none', color: '#1c1f23', font: `400 11.5px/1.4 ${mono}` }}>{recordLabel}</span>}<span style={{ width: 96, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 11.5px/1.4 ${sans}` }}>{type}</span><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: `400 12px/1.4 ${sans}` }}>{row.recordType ? label(dimension === 'reason' ? 'lossCategory' : 'claimType', row.recordType) : type}</span><span style={{ width: 80, flex: 'none', color: '#64686d', font: `400 11.5px/1.4 ${mono}` }}>{row.updatedAt ? formatDateTime(row.updatedAt) : '—'}</span><span style={{ width: 92, flex: 'none', textAlign: 'right', color: amount === '—' ? '#64686d' : '#1c1f23', font: `400 12px/1.4 ${mono}` }}>{amount}</span><span style={{ width: 104, flex: 'none', textAlign: 'right' }}><span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 5, background: stateTone.background, color: stateTone.color, font: `500 10px/1.5 ${sans}` }}>{displayState(state)}</span></span></div>;
          })}</div>
          <footer style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, padding: '11px 0', borderTop: line }}><span style={{ color: '#64686d', font: `400 11px/1.5 ${mono}` }}>{loadFailed ? 'rows unavailable' : `${scopedResultCount} · showing ${rows.length ? from + 1 : 0}–${from + rows.length}`}</span><span style={{ flex: 1 }}/>{page > 1 ? <Link href={recordsHref(page - 1)} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#40454a', textDecoration: 'none', font: `400 11.5px/1 ${sans}` }}>Previous</Link> : <span style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#a7abad', font: `400 11.5px/1 ${sans}` }}>Previous</span>}{!loadFailed && from + rows.length < total ? <Link href={recordsHref(page + 1)} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#40454a', textDecoration: 'none', font: `400 11.5px/1 ${sans}` }}>Next</Link> : null}</footer>
        </section>
      </div>
      <aside aria-label="Report scope and export" tabIndex={0} style={{ width: 300, flex: '0 0 300px', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11, borderRadius: 13, padding: '12px 13px', background: '#f4f3f1' }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHAT THIS LIST PROVES</strong><section style={{ padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: shadow, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>The report total is not a stored number. It is the sum of these rows, recomputed each time, and any row can be opened to its own history.</section><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>SCOPE</strong><section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: shadow }}>{[['Period',periodLabel],['Timezone',timezone],['Currency',currencyLabel],['Mixed currency rows','held, not converted'],['Includes written off','yes'],['Includes held rows','no']].map(([key,value]) => <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{key}</span><span style={{ color: key === 'Includes held rows' ? '#b0431a' : key === 'Mixed currency rows' ? '#7a5310' : '#1c1f23', textAlign: 'right', font: `400 11.5px/1.5 ${mono}` }}>{value}</span></div>)}</section><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>EXPORT</strong><section style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: shadow }}><span style={{ color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{exportHref ? `CSV of all ${formatNumber(total)} rows, with the metric definition and exclusion scope so the file can be reconciled on its own.` : 'A governed CSV export is unavailable for this record scope. No broader export has been substituted.'}</span><div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 9, borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>Last export</span><span style={{ color: '#64686d', font: `400 11.5px/1.5 ${mono}` }}>unavailable</span></div></section><span style={{ flex: 1 }}/><p style={{ margin: 0, paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Exports are logged. <Link href="/settings/governance/audit-trail" style={{ color: '#9b470d', textDecoration: 'none' }}>See who exported what</Link></p></aside>
    </div>
  </section>;
}
