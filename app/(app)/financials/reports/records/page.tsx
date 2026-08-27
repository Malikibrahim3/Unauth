import Link from "next/link";
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
import { entityLabel, financialStageLabel as copyFinancialStageLabel } from "@/lib/ui/merchantCopy";
import { shortRef, hashId } from "@/lib/ui/displayRef";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import {
  formatCurrencyNullable,
  formatDateTime,
  formatMinorCurrencyNullable,
  formatNumber,
} from "@/lib/utils/format";
import ExportMenu from "@/components/reports/ExportMenu";
import { ReportsTabs } from "@/components/reports/ReportsChrome";
import {
  Button,
  DataTableServer,
  Input,
  OperationalState,
  PageFrame,
  RegistrySurface,
  RegistryToolbar,
  Select,
} from "@/components/ui";
import { MoneyValue, UnavailableValue } from "@/components/ui/ProductValue";
import { resolveAnalyticsScope } from "@/lib/analytics/server/scope";
import { getFinancialAnalyticsRecords } from "@/lib/analytics/server/rpc";
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
  const scopedExport = !exactLedgerDrilldown && (dimension === "financial" || dimension === "category") ? (
    <ExportMenu
      range={range}
      timezone={timezone}
      currency={sp.currency?.toUpperCase() ?? null}
      metric={dimension === "financial" ? metric : null}
      category={dimension === "category" ? value : null}
      triggerLabel="Export this scope"
      triggerVariant="primary"
    />
  ) : null;

  return (
    <PageFrame
      title="Supporting records"
      surfaceId="report-records"
      archetype="P5"
      subtitle="The immutable records behind the selected report metric. Export carries this exact scope."
      actions={scopedExport}
      breadcrumbs={[
        { label: "Financials", href: "/financials/losses" },
        { label: "Reports", href: reportHref },
        { label: "Supporting records" },
      ]}
      showCurrentBreadcrumb
      headerCapabilityId="operations-reports"
      tabs={<ReportsTabs view="records" query={{ range, timezone, currency: sp.currency?.toUpperCase() ?? null, compare: 'none', report: reportId }} />}
      toolbar={
        <div className="grid min-w-0 gap-1 text-[length:var(--uo-route-text-metadata-size)]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Link className="ua-text-metadata text-[var(--uo-route-action-primary)]" href={reportHref}>Back to report</Link><span className="text-[var(--uo-route-text-secondary)]">{exactLedgerDrilldown ? "Ledger state" : dimension === "financial" ? "Financial metric" : dimension === "category" ? "Loss category" : "Workflow state"}: {titleValue}</span></div>
          <p className="max-w-[80ch] text-[var(--uo-route-text-tertiary)]">{metricDefinition} {exactLedgerDrilldown ? 'Pagination is applied by the governed ledger RPC before display; this page does not re-filter or re-sort the exact cell result.' : 'Rows are immutable report evidence for the displayed scope; opening a row does not change it. Search applies to each loaded page; amount/date ordering is source-backed for registries and page-local for governed financial record functions.'}</p>
        </div>
      }
      footer={<p>These records are append-only. A correction adds a reversing record; it never edits or removes the row above.</p>}
    >
      <RegistrySurface
        aria-label="Matching report records"
        persistentTable
        toolbar={(
          <RegistryToolbar
            label="Supporting record controls"
            search={exactLedgerDrilldown ? undefined : (
              <form method="get" action="/financials/reports/records" className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                {controlEntries.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
                <input type="hidden" name="sort" value={sort} />
                <input type="hidden" name="pageSize" value={pageSize} />
                <Input name="search" defaultValue={search} aria-label="Search supporting records" placeholder="Search record, state, type, or currency" />
                <Button type="submit" variant="secondary" size="sm">Search</Button>
              </form>
            )}
            viewControls={exactLedgerDrilldown ? undefined : (
              <form method="get" action="/financials/reports/records" className="grid w-[360px] max-w-full grid-cols-[minmax(0,1fr)_112px_auto] items-center gap-2">
                {controlEntries.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
                {search ? <input type="hidden" name="search" value={search} /> : null}
                <Select name="sort" defaultValue={sort} aria-label="Sort supporting records"><option value="updated_desc">Newest updated</option><option value="updated_asc">Oldest updated</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option></Select>
                <Select name="pageSize" defaultValue={String(pageSize)} aria-label="Supporting records per page"><option value="25">25 rows</option><option value="50">50 rows</option><option value="100">100 rows</option></Select>
                <Button type="submit" variant="secondary" size="sm">Apply</Button>
              </form>
            )}
          />
        )}
        resultCount={loadFailed ? "Records unavailable" : scopedResultCount}
        pagination={
          !loadFailed ? (
            <nav aria-label="Matching records pages" className="flex min-h-10 items-center justify-between gap-3">
              {page > 1 ? (
                <Link
                  className="ua-text-label rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--uo-route-surface-hover)]"
                  href={recordsHref(page - 1)}
                >
                  Previous
                </Link>
              ) : <span />}
              {from + rows.length < total ? (
                <Link
                  className="ua-text-label rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--uo-route-surface-hover)]"
                  href={recordsHref(page + 1)}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : undefined
        }
      >
        {loadFailed ? (
          <div data-state-id="report-records-error"><OperationalState
              kind="error"
              title="These report records could not be loaded"
              description={exactScopeUnavailable ? "This chart cell does not carry a complete state, currency, effective-time interval and as-of boundary. No broader record set has been substituted." : "The summary value has not been changed. Retry this same report scope."}
              action={<Link className="ua-text-label text-[var(--uo-route-action-primary)]" href={recordsHref(page)}>Retry records</Link>}
            /></div>
        ) : (
          <DataTableServer<ReportRecordRow>
            flush
            persistentHeader
            density="metadata"
            aria-label="Matching report records"
            rows={rows}
            getRowKey={(row) => row.id}
            emptyState={
              <div data-state-id="report-records-empty"><OperationalState
                  kind="filtered-empty"
                  title={exactLedgerDrilldown ? "No immutable entries match this chart cell" : "No records match this report slice"}
                  description={exactLedgerDrilldown ? 'The ledger has no entry for this exact state, currency, effective-time interval and recorded-at boundary. The chart observation remains missing rather than being presented as zero.' : search ? 'No matching supporting row was loaded on this page. Clear search or continue through the scoped pages; Unauth has not claimed a global zero.' : 'Choose another report range or return to the report to inspect a different metric.'}
                  action={<Link className="ua-text-label text-[var(--uo-route-action-primary)]" href={reportHref}>Back to report</Link>}
                /></div>
            }
            columns={[
              {
                key: "record",
                header: "Record",
                render: (row) => (
                  recordHref(row) ? <Link
                    className="ua-text-working-title font-mono text-[var(--uo-route-text-primary)] hover:text-[var(--uo-route-action-primary)]"
                    href={recordHref(row)!}
                  >
                    {exactLedgerDrilldown ? `Entry ${hashId(row.id)}` : kind === "recovery" ? `Recovery ${hashId(row.id)}` : shortRef(null, row.id)}
                  </Link> : <span className="ua-text-working-title font-mono text-[var(--uo-route-text-primary)]">Entry {hashId(row.id)}</span>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (row) => (
                  <span className="text-[var(--uo-route-text-secondary)]">
                    {exactLedgerDrilldown
                      ? row.reversalOf ? 'Reversal entry' : 'Ledger entry'
                      : kind === "recovery"
                      ? label("attribution", row.recordType)
                      : dimension === "reason"
                        ? row.recordType
                        : label("claimType", row.recordType)}
                  </span>
                ),
              },
              {
                key: "state",
                header: "State",
                render: (row) => exactLedgerDrilldown ? copyFinancialStageLabel(row.status ?? 'unknown') : label(kind === "recovery" ? "recoveryStatus" : "caseStatus", row.status),
              },
              {
                key: "amount",
                header: "Amount",
                kind: "currency",
                render: (row) => row.amountMinor != null
                  ? <MoneyValue minorUnits={row.amountMinor} currency={row.currency} />
                  : row.amountMajor != null
                    ? formatCurrencyNullable(row.amountMajor, row.currency)
                    : <UnavailableValue reason="The record has no verified amount" />,
              },
              {
                key: "updated",
                header: exactLedgerDrilldown ? "Effective" : "Updated",
                kind: "date",
                render: (row) => row.updatedAt ? formatDateTime(row.updatedAt) : <UnavailableValue reason={exactLedgerDrilldown ? "The ledger entry has no effective time" : "The source did not provide an update time"} />,
              },
            ]}
          />
        )}
      </RegistrySurface>
    </PageFrame>
  );
}
