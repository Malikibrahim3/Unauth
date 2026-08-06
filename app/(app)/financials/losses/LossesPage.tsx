import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import {
  FilterChip,
  LeadSummary,
  PageFrame,
  RegistrySurface,
} from '@/components/ui';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import { LossLedger, type LossLedgerRow } from '@/components/losses/LossLedger';
import {
  LossTrendChart,
  type LossTrendCause,
  type LossTrendPoint,
} from '@/components/losses/LossVisuals';
import { freshnessFromTimestamp } from '@/components/sources/FreshnessIndicator';
import { dominantCurrency, formatDateShort, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { recoverySoughtAmount } from '@/lib/recoveries/amounts';
import { label } from '@/lib/ui/labels';
import { selectLossContributions } from '@/lib/visualisation/chartSelectors';
import {
  isLossWrittenOff,
  lossFinancialDisplay,
  summarizeKnownLossExposure,
} from '@/lib/losses/financialDisplay';

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
  written_off_minor: number;
  known_states: string[] | null;
};

type FinancialQueryRow = Omit<FinancialRow, 'known_states'> & {
  known_states?: string[] | null;
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

type MinorSummary = {
  totalMinor: number | null;
  currency: string | null;
  mixedCount: number;
  known: boolean;
};

function oneParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function sumKnownMinor(
  rows: LossLedgerRow[],
  getValue: (row: LossLedgerRow) => number | null | undefined,
  excludeWrittenOff = false,
): MinorSummary {
  const represented = rows.filter((row) => {
    const value = getValue(row);
    return value != null && Number.isFinite(value) && Boolean(row.currency) && (!excludeWrittenOff || !row.writtenOff);
  });
  if (!represented.length) return { totalMinor: null, currency: null, mixedCount: 0, known: false };

  const currency = dominantCurrency(represented);
  let totalMinor = 0;
  let mixedCount = 0;
  for (const row of represented) {
    if (row.currency?.toUpperCase() !== currency) {
      mixedCount += 1;
      continue;
    }
    totalMinor += getValue(row) ?? 0;
  }
  return { totalMinor, currency, mixedCount, known: true };
}

function lossCauseKey(row: LossLedgerRow): string {
  return row.attribution ?? row.category ?? 'unattributed';
}

function hrefForLosses({ attribution, view }: { attribution?: string | null; view?: string | null }) {
  const params = new URLSearchParams();
  if (attribution) params.set('attribution', attribution);
  if (view) params.set('view', view);
  const query = params.toString();
  return query ? `/financials/losses?${query}` : '/financials/losses';
}

function trendBucket(date: Date, weekly: boolean): Date {
  if (!weekly) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const startOfWeekOffset = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - startOfWeekOffset));
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

function buildLossTrend(
  entries: FinancialEntryRow[],
  losses: LossCaseRow[],
  currency: string | null,
): LossTrendPoint[] {
  if (!currency) return [];
  const lossById = new Map(losses.map((loss) => [loss.id, loss]));
  const lossIdByCaseId = new Map(
    losses
      .filter((loss) => loss.support_payout_case_id)
      .map((loss) => [loss.support_payout_case_id as string, loss.id]),
  );
  const dated = entries.filter((entry) => {
    if (entry.state !== 'confirmed_loss' || entry.amount_minor <= 0 || entry.currency?.toUpperCase() !== currency) return false;
    return Number.isFinite(Date.parse(entry.effective_at));
  });
  if (!dated.length) return [];

  const timestamps = dated.map((entry) => Date.parse(entry.effective_at));
  const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000;
  const weekly = spanDays > 31;
  const groups = new Map<string, { date: Date; causes: Map<string, LossTrendCause> }>();

  for (const entry of dated) {
    const date = trendBucket(new Date(entry.effective_at), weekly);
    const key = date.toISOString().slice(0, 10);
    const group = groups.get(key) ?? { date, causes: new Map<string, LossTrendCause>() };
    const lossId = entry.loss_case_id ?? (entry.support_payout_case_id ? lossIdByCaseId.get(entry.support_payout_case_id) : undefined);
    const loss = lossId ? lossById.get(lossId) : undefined;
    const causeKey = loss?.attribution ?? loss?.case_category ?? 'unattributed';
    const causeLabel = loss?.attribution
      ? label('attribution', causeKey)
      : loss?.case_category
        ? label('lossCategory', causeKey)
        : 'Attribution unavailable';
    const existing = group.causes.get(causeKey);
    group.causes.set(causeKey, {
      key: causeKey,
      label: causeLabel,
      valueMinor: (existing?.valueMinor ?? 0) + entry.amount_minor,
      href: hrefForLosses({ attribution: causeKey }),
    });
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((group) => {
      const causes = [...group.causes.values()].sort((left, right) => right.valueMinor - left.valueMinor);
      return {
        key: group.date.toISOString().slice(0, 10),
        label: weekly ? `Week of ${formatDateShort(group.date)}` : formatDateShort(group.date),
        totalMinor: causes.reduce((sum, cause) => sum + cause.valueMinor, 0),
        causes,
      };
    });
}

function metricValue(summary: MinorSummary): string {
  return summary.known ? formatMinorCurrencyNullable(summary.totalMinor, summary.currency) : '—';
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
  const selectedAttribution = oneParam(params.attribution);
  const selectedViewParam = oneParam(params.view);
  const selectedView = ['all', 'confirmed', 'estimated', 'recoverable', 'prevented', 'written_off'].includes(selectedViewParam ?? '')
    ? selectedViewParam as 'all' | 'confirmed' | 'estimated' | 'recoverable' | 'prevented' | 'written_off'
    : 'all';
  const nowMs = Date.now();

  const [lossResult, orphanResult] = await Promise.all([
    serviceClient
      .from(TABLES.LOSS_CASES)
      .select('id,support_payout_case_id,case_category,attribution,counterparty_type,counterparty_name,status,recoverability,financial_state,prevention_only,written_off_at,estimated_recovery_minor,currency,source_metadata,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .order('updated_at', { ascending: false })
      .limit(500),
    serviceClient
      .from(TABLES.RECOVERY_CASES)
      .select('id,support_payout_case_id,recovery_type,owner_type,status,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,currency,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .is('loss_case_id', null)
      .eq('prevention_only', false)
      .gt('merchant_loss_amount', 0)
      .limit(500),
  ]);
  if (lossResult.error) throw new Error(`loss_registry_failed: ${lossResult.error.message}`);
  if (orphanResult.error) throw new Error(`loss_recovery_registry_failed: ${orphanResult.error.message}`);

  const raw = (lossResult.data ?? []) as LossCaseRow[];
  const orphanRecoveries = (orphanResult.data ?? []) as OrphanRecoveryRow[];
  const lossIds = raw.map((row) => row.id);
  const caseIds = raw.flatMap((row) => row.support_payout_case_id ? [row.support_payout_case_id] : []);

  const [financialResult, entriesByCaseResult, entriesByLossResult] = await Promise.all([
    caseIds.length
      ? serviceClient
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,written_off_minor,known_states')
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
  ]);
  let financialError = financialResult.error;
  let financialData = (financialResult.data ?? []) as FinancialQueryRow[];
  if (shouldRetryWithoutKnownStates(financialError)) {
    const legacyFinancialResult = caseIds.length
      ? await serviceClient
        .from(TABLES.CASE_FINANCIAL_SUMMARIES)
        .select('support_payout_case_id,currency,confirmed_loss_minor,estimated_loss_minor,recoverable_minor,recovered_minor,written_off_minor')
        .eq('merchant_id', ctx.merchantId)
        .in('support_payout_case_id', caseIds)
      : { data: [], error: null };
    financialData = (legacyFinancialResult.data ?? []) as FinancialQueryRow[];
    financialError = legacyFinancialResult.error;
  }
  if (financialError) throw new Error(`loss_financial_summary_failed: ${financialError.message}`);
  if (entriesByCaseResult.error) throw new Error(`loss_financial_history_failed: ${entriesByCaseResult.error.message}`);
  if (entriesByLossResult.error) throw new Error(`loss_financial_loss_history_failed: ${entriesByLossResult.error.message}`);

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
      currency: recovery.currency,
      source: 'recovery_case',
      freshness: freshnessFromTimestamp(recovery.updated_at, nowMs),
      updatedAt: recovery.updated_at,
    };
  });
  const rows = [...canonicalRows, ...derivedRows];

  const exposure = summarizeKnownLossExposure(rows);
  const entryCurrencies = entries
    .filter((entry) => entry.state === 'confirmed_loss' && entry.amount_minor > 0 && entry.currency)
    .map((entry) => entry.currency.toUpperCase());
  const displayCurrency = exposure.currency ?? entryCurrencies[0] ?? null;
  const confirmedLoss = sumKnownMinor(rows, (row) => row.realisedLossMinor, true);
  const netUnrecovered = sumKnownMinor(rows, (row) => row.netUnrecoveredMinor);
  const recoverable = sumKnownMinor(rows, (row) => row.recoverableMinor, true);
  const mixedHint = Math.max(exposure.mixedCount, confirmedLoss.mixedCount, recoverable.mixedCount, netUnrecovered.mixedCount);
  const contributions = selectLossContributions(rows.map((row) => ({
    key: lossCauseKey(row),
    label: row.attribution ? label('attribution', lossCauseKey(row)) : label('lossCategory', lossCauseKey(row)),
    amountMinor: row.realisedLossMinor ?? row.estimatedLossMinor,
    currency: row.currency,
    writtenOff: row.writtenOff,
  })), displayCurrency);
  const topContributions = contributions.slice(0, 5);
  const otherContributions = contributions.slice(5);
  const otherValueMajor = otherContributions.reduce((sum, item) => sum + item.valueMajor, 0);
  const causeOptions = otherContributions.length
    ? [...topContributions, { key: '__other', label: 'Other', valueMajor: otherValueMajor }]
    : topContributions;
  const trend = buildLossTrend(entries, raw, displayCurrency);
  const causeScopedRows = selectedAttribution === '__other'
    ? rows.filter((row) => otherContributions.some((item) => item.key === lossCauseKey(row)))
    : selectedAttribution
      ? rows.filter((row) => lossCauseKey(row) === selectedAttribution)
      : rows;

  return (
    <PageFrame
      title="Losses"
      subtitle="See where merchant value remains unrecovered and which causes deserve attention."
      metrics={
        <LeadSummary
          aria-label="Loss financial summary"
          lead={{
            label: 'Net unrecovered',
            value: metricValue(netUnrecovered),
            description: mixedHint ? `${mixedHint} incompatible record${mixedHint === 1 ? '' : 's'} excluded` : 'Known loss less reconciled recovery',
          }}
          supporting={[
            { label: 'Recoverable value', value: metricValue(recoverable), description: 'Eligible value still available to chase' },
            { label: 'Confirmed loss', value: metricValue(confirmedLoss), description: 'Append-only confirmed loss stage' },
            { label: 'Loss records', value: formatNumber(rows.length), description: derivedRows.length ? `${derivedRows.length} awaiting reconciliation` : 'Recorded loss cases' },
          ]}
        />
      }
      primaryVisual={
        <div className="grid min-w-0 gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <LossTrendChart
              data={trend}
              currency={displayCurrency}
              mixedCurrencyCount={exposure.mixedCount}
            />
          </div>
          <div className="min-w-0 self-start xl:col-span-4">
            <RankedContributionChart
              id="loss-causes"
              title="Which causes account for most value?"
              description="Recorded loss value ranked by the primary attribution"
              items={causeOptions.map((item) => ({
                label: item.label,
                value: item.valueMajor,
                displayValue: formatMinorCurrencyNullable(Math.round(item.valueMajor * 100), displayCurrency),
                detail: item.key === '__other' ? `${otherContributions.length} causes` : undefined,
              }))}
              records={{ href: '/financials/losses', label: 'View all loss records' }}
              compact={causeOptions.length <= 2}
            />
          </div>
        </div>
      }
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Loss cause filters">
          <span className="mr-1 text-xs font-medium text-[var(--ua-text-secondary)]">Cause</span>
          <FilterChip href={hrefForLosses({ view: selectedView })} active={!selectedAttribution}>All causes</FilterChip>
          {causeOptions.map((item) => (
            <FilterChip
              key={item.key}
              href={hrefForLosses({ attribution: item.key, view: selectedView })}
              active={selectedAttribution === item.key}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      }
      footer={
        <p className="text-xs text-[var(--ua-text-tertiary)]">
          Amounts stay in their recorded currency. Loss history uses immutable effective dates; unavailable stages remain unavailable rather than becoming zero.
        </p>
      }
    >
      <RegistrySurface
        aria-label="Loss registry"
        resultCount={`${causeScopedRows.length} ${causeScopedRows.length === 1 ? 'loss record' : 'loss records'}${selectedAttribution ? ' in this cause' : ''}`}
      >
        <LossLedger
          rows={rows}
          selectedAttribution={selectedAttribution}
          otherAttributionKeys={otherContributions.map((item) => item.key)}
          initialView={selectedView}
        />
      </RegistrySurface>
    </PageFrame>
  );
}
