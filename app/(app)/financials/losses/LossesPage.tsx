import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { PageFrame } from '@/components/ui';
import type { LossLedgerRow } from '@/components/losses/LossLedger';
import { LossLedgerOperations } from '@/components/losses/LossLedgerOperations';
import ExportMenu from '@/components/reports/ExportMenu';
import { freshnessFromTimestamp } from '@/components/sources/FreshnessIndicator';
import { recoverySoughtAmount } from '@/lib/recoveries/amounts';
import {
  isLossWrittenOff,
  lossFinancialDisplay,
  summarizeKnownLossExposure,
} from '@/lib/losses/financialDisplay';
import {
  filterAndSortLossRows,
  LOSS_QUERY_STATUSES,
  type LossQuerySort,
  type LossQueryStatus,
} from '@/lib/losses/queryState';
import {
  parseReportRange,
  reportCutoff,
  type ReportRange,
} from '@/lib/reporting/intelligence';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import { loadCanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

export const dynamic = 'force-dynamic';

type LossCaseRow = {
  id: string;
  support_payout_case_id: string | null;
  case_category: string;
  attribution: string | null;
  counterparty_type: string | null;
  counterparty_name: string | null;
  status: string;
  recoverability: string | null;
  financial_state: string;
  prevention_only: boolean;
  written_off_at: string | null;
  estimated_recovery_minor: number | null;
  currency: string | null;
  source_metadata: Record<string, unknown> | null;
  updated_at: string;
};

type FinancialRow = {
  support_payout_case_id: string;
  currency: string;
  confirmed_loss_minor: number;
  estimated_loss_minor: number;
  recoverable_minor: number;
  recovered_minor: number;
  prevented_minor: number;
  written_off_minor: number;
  known_states: string[] | null;
};

type FinancialQueryRow = Omit<FinancialRow, 'known_states'> & {
  known_states?: string[] | null;
};

type PayoutIdentityRow = {
  id: string;
  source_order_id: string | null;
};

type OrderIdentityRow = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
};

type FinancialEntryRow = {
  id: string;
  loss_case_id: string | null;
  support_payout_case_id: string | null;
  state: string;
  amount_minor: number;
  currency: string;
  effective_at: string;
};

type OrphanRecoveryRow = {
  id: string;
  support_payout_case_id: string;
  recovery_type: string;
  owner_type: string;
  status: string;
  merchant_loss_amount: number | string;
  eligible_loss_amount: number | string | null;
  estimated_recoverable_max: number | string | null;
  amount_recovered: number | string | null;
  currency: string;
  updated_at: string;
};

type LossSearchParams = Record<string, string | string[] | undefined>;

function oneParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function lossCauseKey(row: LossLedgerRow): string {
  return row.attribution ?? row.category ?? 'unattributed';
}

type LossQueryHref = {
  range?: ReportRange | null;
  currency?: string | null;
  source?: string | null;
  status?: LossQueryStatus | null;
  search?: string | null;
  sort?: LossQuerySort | null;
  page?: number | null;
};

function hrefForLosses({ range, currency, source, status, search, sort, page }: LossQueryHref) {
  const params = new URLSearchParams();
  if (range) params.set('range', range);
  if (currency) params.set('currency', currency);
  if (source) params.set('source', source);
  if (status && status !== 'all') params.set('status', status);
  if (search) params.set('search', search);
  if (sort && sort !== 'updated_desc') params.set('sort', sort);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/financials/losses?${query}` : '/financials/losses';
}

function shouldRetryWithoutKnownStates(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === '42703' || error.message?.includes('known_states')));
}

function normaliseFinancialRows(rows: FinancialQueryRow[], entries: FinancialEntryRow[]): FinancialRow[] {
  const statesByCase = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry.support_payout_case_id) continue;
    const states = statesByCase.get(entry.support_payout_case_id) ?? new Set<string>();
    states.add(entry.state);
    statesByCase.set(entry.support_payout_case_id, states);
  }

  return rows.map((row) => ({
    ...row,
    known_states: Array.isArray(row.known_states)
      ? row.known_states
      : [...(statesByCase.get(row.support_payout_case_id) ?? new Set<string>())].sort(),
  }));
}

export default async function LossesPage({
  searchParams,
}: {
  searchParams?: Promise<LossSearchParams>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const params = searchParams ? await searchParams : {};
  const range = parseReportRange(oneParam(params.range) ?? undefined);
  const selectedSearch = (oneParam(params.search) ?? oneParam(params.attribution))?.slice(0, 100) ?? null;
  const selectedSource = oneParam(params.source)?.slice(0, 100) ?? null;
  const requestedCurrency = oneParam(params.currency)?.toUpperCase() ?? null;
  const statusParam = oneParam(params.status) ?? oneParam(params.view);
  const selectedStatus = LOSS_QUERY_STATUSES.includes(statusParam as LossQueryStatus)
    ? statusParam as LossQueryStatus
    : 'all';
  const sortParam = oneParam(params.sort);
  const selectedSort: LossQuerySort = ['updated_asc', 'loss_desc', 'outstanding_desc'].includes(sortParam ?? '')
    ? sortParam as LossQuerySort
    : 'updated_desc';
  const pageParam = Number(oneParam(params.page));
  const selectedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const nowMs = Date.now();
  const cutoff = reportCutoff(range, new Date(nowMs));

  const [lossResult, orphanResult, aggregate] = await Promise.all([
    serviceClient
      .from(TABLES.LOSS_CASES)
      .select('id,support_payout_case_id,case_category,attribution,counterparty_type,counterparty_name,status,recoverability,financial_state,prevention_only,written_off_at,estimated_recovery_minor,currency,source_metadata,updated_at', { count: 'exact' })
      .eq('merchant_id', ctx.merchantId)
      .order('updated_at', { ascending: false })
      .limit(500),
    serviceClient
      .from(TABLES.RECOVERY_CASES)
      .select('id,support_payout_case_id,recovery_type,owner_type,status,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,currency,updated_at', { count: 'exact' })
      .eq('merchant_id', ctx.merchantId)
      .is('loss_case_id', null)
      .eq('prevention_only', false)
      .gt('merchant_loss_amount', 0)
      .limit(500),
    loadCanonicalFinancialAggregate(serviceClient, ctx.merchantId, {
      from: cutoff,
      to: new Date(nowMs).toISOString(),
      currency: requestedCurrency && /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : null,
    }),
  ]);
  if (lossResult.error) throw new Error(`loss_registry_failed: ${lossResult.error.message}`);
  if (orphanResult.error) throw new Error(`loss_recovery_registry_failed: ${orphanResult.error.message}`);

  const raw = (lossResult.data ?? []) as LossCaseRow[];
  const orphanRecoveries = (orphanResult.data ?? []) as OrphanRecoveryRow[];
  const lossIds = raw.map((row) => row.id);
  const caseIds = [...new Set([
    ...raw.flatMap((row) => row.support_payout_case_id ? [row.support_payout_case_id] : []),
    ...orphanRecoveries.map((row) => row.support_payout_case_id),
  ])];

  const [financialResult, entriesByCaseResult, entriesByLossResult, payoutIdentityResult] = await Promise.all([
    caseIds.length
      ? serviceClient
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,prevented_minor,written_off_minor,known_states')
        .eq('merchant_id', ctx.merchantId)
        .in('support_payout_case_id', caseIds)
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? serviceClient
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .select('id,loss_case_id,support_payout_case_id,state,amount_minor,currency,effective_at')
        .eq('merchant_id', ctx.merchantId)
        .in('support_payout_case_id', caseIds)
        .order('effective_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    lossIds.length
      ? serviceClient
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .select('id,loss_case_id,support_payout_case_id,state,amount_minor,currency,effective_at')
        .eq('merchant_id', ctx.merchantId)
        .in('loss_case_id', lossIds)
        .order('effective_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? serviceClient
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id,source_order_id')
        .eq('merchant_id', ctx.merchantId)
        .in('id', caseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  let financialError = financialResult.error;
  let financialData = (financialResult.data ?? []) as FinancialQueryRow[];
  if (shouldRetryWithoutKnownStates(financialError)) {
    const legacyFinancialResult = caseIds.length
      ? await serviceClient
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,prevented_minor,written_off_minor')
        .eq('merchant_id', ctx.merchantId)
        .in('support_payout_case_id', caseIds)
      : { data: [], error: null };
    financialData = (legacyFinancialResult.data ?? []) as FinancialQueryRow[];
    financialError = legacyFinancialResult.error;
  }
  if (financialError) throw new Error(`loss_financial_summary_failed: ${financialError.message}`);
  if (entriesByCaseResult.error) throw new Error(`loss_financial_history_failed: ${entriesByCaseResult.error.message}`);
  if (entriesByLossResult.error) throw new Error(`loss_financial_loss_history_failed: ${entriesByLossResult.error.message}`);
  if (payoutIdentityResult.error) throw new Error(`loss_case_identity_failed: ${payoutIdentityResult.error.message}`);

  const payoutIdentities = (payoutIdentityResult.data ?? []) as PayoutIdentityRow[];
  const orderIds = [...new Set(payoutIdentities.flatMap((row) => row.source_order_id ? [row.source_order_id] : []))];
  const orderIdentityResult = orderIds.length
    ? await serviceClient
      .from(TABLES.SOURCE_ORDERS)
      .select('id,order_number,customer_name')
      .eq('merchant_id', ctx.merchantId)
      .in('id', orderIds)
    : { data: [], error: null };
  if (orderIdentityResult.error) throw new Error(`loss_order_identity_failed: ${orderIdentityResult.error.message}`);
  const orderById = new Map(((orderIdentityResult.data ?? []) as OrderIdentityRow[]).map((row) => [row.id, row]));
  const identityByCase = new Map(payoutIdentities.map((row) => [row.id, row.source_order_id ? orderById.get(row.source_order_id) ?? null : null]));

  const entries = [...new Map(
    [...(entriesByCaseResult.data ?? []), ...(entriesByLossResult.data ?? [])]
      .map((entry) => [entry.id, entry]),
  ).values()] as FinancialEntryRow[];
  const financialRows = normaliseFinancialRows(financialData, entries);
  const financialByCase = new Map(financialRows.map((row) => [row.support_payout_case_id, row]));

  const canonicalRows: LossLedgerRow[] = raw.map((row) => {
    const summary = row.support_payout_case_id ? financialByCase.get(row.support_payout_case_id) : undefined;
    const display = lossFinancialDisplay(summary, row.estimated_recovery_minor);
    const lossMinor = display.realisedLossMinor ?? display.estimatedLossMinor;
    return {
      id: row.id,
      supportPayoutCaseId: row.support_payout_case_id,
      caseReference: row.support_payout_case_id ? identityByCase.get(row.support_payout_case_id)?.order_number ?? null : null,
      customerName: row.support_payout_case_id ? identityByCase.get(row.support_payout_case_id)?.customer_name ?? null : null,
      category: row.case_category,
      attribution: row.attribution,
      counterpartyType: row.counterparty_type,
      counterpartyName: row.counterparty_name,
      status: row.status,
      recoverability: row.recoverability,
      financialState: row.financial_state,
      preventionOnly: row.prevention_only,
      writtenOff: isLossWrittenOff(row.status, row.written_off_at),
      realisedLossMinor: display.realisedLossMinor,
      estimatedLossMinor: display.estimatedLossMinor,
      netUnrecoveredMinor: lossMinor != null && display.recoveredMinor != null
        ? Math.max(0, lossMinor - display.recoveredMinor)
        : null,
      recoverableMinor: display.recoverableMinor,
      recoveredMinor: display.recoveredMinor,
      preventedMinor: summary?.prevented_minor ?? null,
      currency: summary?.currency ?? row.currency,
      source: typeof row.source_metadata?.origin === 'string'
        ? row.source_metadata.origin
        : typeof row.source_metadata?.source_label === 'string'
          ? row.source_metadata.source_label
          : null,
      freshness: freshnessFromTimestamp(row.updated_at, nowMs),
      updatedAt: row.updated_at,
    };
  });
  const derivedRows: LossLedgerRow[] = orphanRecoveries.map((recovery) => {
    const merchantLossMinor = Math.round(Number(recovery.merchant_loss_amount) * 100);
    const recoveredMinor = recovery.amount_recovered == null ? null : Math.round(Number(recovery.amount_recovered) * 100);
    const amounts = {
      merchant_loss_amount: Number(recovery.merchant_loss_amount),
      eligible_loss_amount: recovery.eligible_loss_amount == null ? null : Number(recovery.eligible_loss_amount),
      estimated_recoverable_max: recovery.estimated_recoverable_max == null ? null : Number(recovery.estimated_recoverable_max),
    };
    return {
      id: `recovery:${recovery.id}`,
      detailHref: `/financials/recovery/${recovery.id}`,
      derived: true,
      supportPayoutCaseId: recovery.support_payout_case_id,
      caseReference: identityByCase.get(recovery.support_payout_case_id)?.order_number ?? null,
      customerName: identityByCase.get(recovery.support_payout_case_id)?.customer_name ?? null,
      category: recovery.recovery_type === 'carrier_claim' ? 'delivery_loss' : 'unknown_post_purchase_loss',
      attribution: recovery.recovery_type,
      counterpartyType: recovery.owner_type,
      counterpartyName: null,
      status: recovery.status,
      recoverability: 'recoverable',
      financialState: 'confirmed',
      preventionOnly: false,
      writtenOff: recovery.status === 'closed_unrecoverable',
      realisedLossMinor: merchantLossMinor,
      estimatedLossMinor: null,
      netUnrecoveredMinor: recoveredMinor == null ? null : Math.max(0, merchantLossMinor - recoveredMinor),
      recoverableMinor: Math.round(recoverySoughtAmount(amounts) * 100),
      recoveredMinor,
      preventedMinor: null,
      currency: recovery.currency,
      source: 'recovery_case',
      freshness: freshnessFromTimestamp(recovery.updated_at, nowMs),
      updatedAt: recovery.updated_at,
    };
  });
  const rows = [...canonicalRows, ...derivedRows];
  const currencies = [...new Set([
    ...rows.flatMap((row) => row.currency ? [row.currency.toUpperCase()] : []),
    ...aggregate.currencies.map((row) => row.currency),
  ])].sort();
  const selectedCurrency = requestedCurrency && currencies.includes(requestedCurrency) ? requestedCurrency : null;
  const currencyRows = selectedCurrency ? rows.filter((row) => row.currency?.toUpperCase() === selectedCurrency) : rows;
  const sourceCohort = filterAndSortLossRows(currencyRows, {
    cutoff,
    source: null,
    status: 'all',
    search: null,
    sort: selectedSort,
  });
  const sourceOptions = [...new Set(sourceCohort.map((row) => row.source ?? 'unavailable'))].sort();
  const selectedSourceValue = selectedSource && sourceOptions.includes(selectedSource) ? selectedSource : null;
  const preSearchRows = filterAndSortLossRows(currencyRows, {
    cutoff,
    source: selectedSourceValue,
    status: selectedStatus,
    search: null,
    sort: selectedSort,
  });

  const exposure = summarizeKnownLossExposure(preSearchRows);
  const entryCurrencies = entries.filter((entry) => entry.currency).map((entry) => entry.currency.toUpperCase());
  const displayCurrency = selectedCurrency ?? exposure.currency ?? entryCurrencies[0] ?? null;
  const priorRows = cutoff
    ? (() => {
        const currentStartMs = Date.parse(cutoff);
        const periodMs = nowMs - currentStartMs;
        if (!Number.isFinite(currentStartMs) || !(periodMs > 0)) return [];
        const previousStart = new Date(currentStartMs - periodMs).toISOString();
        return filterAndSortLossRows(currencyRows, {
          cutoff: previousStart,
          source: selectedSourceValue,
          status: selectedStatus,
          search: null,
          sort: selectedSort,
        }).filter((row) => {
          const updatedMs = row.updatedAt ? Date.parse(row.updatedAt) : Number.NaN;
          return Number.isFinite(updatedMs) && updatedMs < currentStartMs;
        });
      })()
    : [];
  const queryState: LossQueryHref = {
    range,
    currency: selectedCurrency,
    source: selectedSourceValue,
    status: selectedStatus,
    search: selectedSearch,
    sort: selectedSort,
    page: selectedPage,
  };
  const lossHref = (patch: Partial<LossQueryHref>) => hrefForLosses({ ...queryState, ...patch });
  const causeKeys = new Set(preSearchRows.map((row) => lossCauseKey(row)));
  const selectedCauseKey = selectedSearch && causeKeys.has(selectedSearch) ? selectedSearch : null;

  return (
    <PageFrame
      title="Loss ledger"
      surfaceId="loss-ledger"
      archetype="operations-loss-ledger"
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Loss ledger' }]}
      showCurrentBreadcrumb
      actions={<div className="uo-header-actions"><span>{TIME_RANGE_LABELS[range]}</span><ExportMenu range={range} currency={displayCurrency} /></div>}
    >
      <LossLedgerOperations
        rows={preSearchRows}
        priorRows={priorRows}
        currency={displayCurrency}
        rangeLabel={TIME_RANGE_LABELS[range]}
        selectedCause={selectedCauseKey}
        hrefForCause={(cause) => lossHref({ search: cause, page: null })}
        page={selectedPage}
        hrefForPage={(nextPage) => lossHref({ page: nextPage })}
        aggregate={aggregate}
        recordLimitation={(lossResult.count ?? raw.length) > raw.length || (orphanResult.count ?? orphanRecoveries.length) > orphanRecoveries.length
          ? `Record-level charts and rows are partial: showing up to 500 loss records and 500 orphan recovery records. Canonical KPIs remain exact for the selected scope.`
          : null}
      />
    </PageFrame>
  );
}
