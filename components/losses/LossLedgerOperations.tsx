import Link from 'next/link';
import { formatDateMode, formatMoney, formatNumber } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';
import { shortRef } from '@/lib/ui/displayRef';
import { Pagination } from '@/components/ui/Pagination';
import type { LossLedgerRow } from './LossLedger';
import type { CanonicalFinancialAggregate } from '@/lib/financial/canonicalAggregates';

const PAGE_SIZE = 9;

type CauseGroup = {
  key: string;
  name: string;
  rows: LossLedgerRow[];
  realisedMinor: number;
  recoverableMinor: number;
  priorMinor: number | null;
};

type Props = {
  rows: LossLedgerRow[];
  priorRows?: LossLedgerRow[];
  currency: string | null;
  rangeLabel: string;
  selectedCause: string | null;
  hrefForCause: (cause: string | null) => string;
  page: number;
  hrefForPage: (page: number) => string;
  aggregate: CanonicalFinancialAggregate;
  recordLimitation: string | null;
};

function rowCause(row: LossLedgerRow) {
  const key = row.attribution ?? row.category ?? 'unattributed';
  return {
    key,
    name: row.attribution ? label('attribution', key) : label('lossCategory', key),
  };
}

function sumKnown(rows: LossLedgerRow[], pick: (row: LossLedgerRow) => number | null | undefined) {
  let total = 0;
  let known = false;
  for (const row of rows) {
    const value = pick(row);
    if (value == null) continue;
    known = true;
    total += value;
  }
  return known || rows.length === 0 ? total : null;
}

function money(value: number | null, currency: string | null) {
  if (value == null || !currency) return '—';
  try {
    return formatMoney(value, currency).replace(/\.00$/, '');
  } catch {
    return '—';
  }
}

function signedMoney(value: number | null, currency: string | null) {
  if (value == null || !currency) return '—';
  return value === 0 ? money(0, currency) : `−${money(Math.abs(value), currency)}`;
}

function axisMoney(value: number, currency: string | null) {
  if (!currency) return '—';
  const major = value / 100;

  const symbol = money(0, currency).replace(/0(?:\.00)?$/, '');

  if (major === 0) return `${symbol}0`;

  if (Math.abs(major) >= 1000) {
    const thousands = major / 1000;
    return `${symbol}${thousands.toFixed(Number.isInteger(thousands) ? 0 : 1)}k`;
  }
  return money(value, currency).replace(/\.00$/, '');
}

function niceCeil(value: number) {
  if (!(value > 0)) return 100;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / exponent;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * exponent;
}

function stageFor(row: LossLedgerRow) {
  if (row.writtenOff || row.preventionOnly || (row.realisedLossMinor != null && row.recoveredMinor != null && row.recoveredMinor >= row.realisedLossMinor)) return 'Closed';
  const status = `${row.status} ${row.financialState}`.toLowerCase();
  if (/recover|approved|paid|submitted|response/.test(status)) return 'Recovery';
  if (/confirm|decision|review/.test(status)) return 'Decision';
  if (/evidence|investigat|estimate/.test(status)) return 'Evidence';
  return 'Intake';
}

function initials(name: string | null | undefined) {
  if (!name) return '—';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
}

function causeGroups(rows: LossLedgerRow[], priorRows: LossLedgerRow[]): CauseGroup[] {
  const groups = new Map<string, CauseGroup>();
  for (const row of rows) {
    const cause = rowCause(row);
    const group = groups.get(cause.key) ?? {
      key: cause.key,
      name: cause.name,
      rows: [],
      realisedMinor: 0,
      recoverableMinor: 0,
      priorMinor: null,
    };
    group.rows.push(row);
    group.realisedMinor += row.realisedLossMinor ?? 0;
    const openRecoverable = row.recoverableMinor == null
      ? 0
      : Math.max(0, row.recoverableMinor - (row.recoveredMinor ?? 0) - (row.writtenOff ? row.recoverableMinor : 0));
    group.recoverableMinor += Math.min(row.realisedLossMinor ?? openRecoverable, openRecoverable);
    groups.set(cause.key, group);
  }

  const priorByCause = new Map<string, LossLedgerRow[]>();
  for (const row of priorRows) {
    const key = rowCause(row).key;
    priorByCause.set(key, [...(priorByCause.get(key) ?? []), row]);
  }
  for (const group of groups.values()) {
    const matchingPriorRows = priorByCause.get(group.key) ?? [];
    group.priorMinor = matchingPriorRows.length
      ? sumKnown(matchingPriorRows, (row) => row.realisedLossMinor)
      : null;
  }

  return [...groups.values()]
    .sort((left, right) => right.realisedMinor - left.realisedMinor)
    .slice(0, 6);
}

function LossCauseChart({
  groups,
  currency,
  href,
}: {
  groups: CauseGroup[];
  currency: string | null;
  href: string;
}) {
  if (!groups.length || !currency || groups.every((group) => group.realisedMinor === 0)) {
    return (
      <div className="uo-empty" data-state-id="loss-cause-chart-unavailable">
        <strong>Loss position unavailable</strong>
        <span>No compatible realised-loss values exist in this scope.</span>
      </div>
    );
  }

  const maximum = Math.max(
    ...groups.flatMap((group) => [group.realisedMinor, group.priorMinor ?? 0]),
    1,
  );
  const axisMaximum = niceCeil(maximum * 1.08);
  const axisPoints = [0, 0.5, 1];
  const axisPosition = (value: number) => `${Math.max(0, Math.min(100, (value / axisMaximum) * 100)).toFixed(2)}%`;

  return (
    <div className="uo-loss-chart" aria-label="Realised loss by cause against the prior period">
      <div className="uo-loss-chart-axis" aria-hidden="true">
        <span />
        <div>
          {axisPoints.map((point) => (
            <span
              key={point}
              style={{
                left: `${point * 100}%`,
                transform: point === 0 ? 'translateX(0)' : point === 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {axisMoney(axisMaximum * point, currency)}
            </span>
          ))}
        </div>
        <span />
        <span />
      </div>

      <div className="uo-loss-chart-rows">
        {groups.map((group) => {
          const confirmed = Math.max(0, group.realisedMinor - group.recoverableMinor);
          const recoverable = Math.max(0, group.realisedMinor - confirmed);
          const delta = group.priorMinor != null && group.priorMinor > 0
            ? ((group.realisedMinor - group.priorMinor) / group.priorMinor) * 100
            : null;

          return (
            <div className="uo-loss-chart-row" key={group.key}>
              <span className="uo-loss-chart-label" title={group.name}>{group.name}</span>
              <div className="uo-loss-chart-track">
                {axisPoints.map((point) => <i key={point} style={{ left: `${point * 100}%` }} aria-hidden="true" />)}
                <span
                  className="uo-loss-chart-bar"
                  style={{ width: axisPosition(group.realisedMinor) }}
                  role="img"
                  aria-label={`${group.name}: ${money(group.realisedMinor, currency)}`}
                >
                  <b style={{ width: `${group.realisedMinor > 0 ? (confirmed / group.realisedMinor) * 100 : 0}%` }} />
                  <em style={{ width: `${group.realisedMinor > 0 ? (recoverable / group.realisedMinor) * 100 : 0}%` }} />
                </span>
                {group.priorMinor != null ? (
                  <i
                    className="uo-loss-chart-prior"
                    style={{ left: axisPosition(group.priorMinor) }}
                    role="img"
                    title={`Prior 30 days: ${money(group.priorMinor, currency)}`}
                    aria-label={`Prior 30 days: ${money(group.priorMinor, currency)}`}
                  />
                ) : null}
              </div>
              <strong>{axisMoney(group.realisedMinor, currency)}</strong>
              <span className={delta == null ? 'uo-loss-chart-delta uo-muted' : `uo-loss-chart-delta ${delta >= 0 ? 'uo-loss-chart-delta--negative' : 'uo-loss-chart-delta--positive'}`}>
                {delta == null ? 'Prior unavailable' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}% vs prior`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="uo-chart-footnote">
        <span>{currency} · Europe/London · realised loss only, excluding prevented and recovered amounts · prior period shown where recorded</span>
        <Link href={href}>View chart data</Link>
      </div>
    </div>
  );
}

export function LossLedgerOperations({ rows, priorRows = [], currency, rangeLabel, selectedCause, hrefForCause, page, hrefForPage, aggregate, recordLimitation }: Props) {
  const compatibleRows = currency ? rows.filter((row) => row.currency?.toUpperCase() === currency.toUpperCase()) : rows;
  const compatiblePriorRows = currency ? priorRows.filter((row) => row.currency?.toUpperCase() === currency.toUpperCase()) : priorRows;
  const groups = causeGroups(compatibleRows, compatiblePriorRows);
  const filteredRows = selectedCause
    ? compatibleRows.filter((row) => rowCause(row).key === selectedCause)
    : compatibleRows;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const aggregateRow = currency ? aggregate.currencies.find((row) => row.currency === currency.toUpperCase()) ?? null : null;
  const identified = aggregateRow?.knownStates.includes('exposed') ? aggregateRow.exposedMinor : null;
  const prevented = aggregateRow?.knownStates.includes('prevented') ? aggregateRow.preventedMinor : null;
  const recovered = aggregateRow?.knownStates.includes('recovered') ? aggregateRow.recoveredMinor : null;
  const realised = aggregateRow?.knownStates.includes('confirmed_loss') ? aggregateRow.confirmedLossMinor : null;
  const identifiedCount = aggregateRow?.caseCountsByState.exposed ?? null;
  const preventedShare = identified && prevented != null ? `${Math.round((prevented / identified) * 1000) / 10}% of identified` : 'Share unavailable';
  const periodLabel = rangeLabel.replace(/^Last\s+/i, '').toLowerCase();
  const kpis = [
    { label: 'Identified', value: money(identified, currency), sub: `${identifiedCount == null ? '—' : formatNumber(identifiedCount)} canonical cases · ${periodLabel}`, tone: 'default' },
    { label: 'Prevented', value: money(prevented, currency), sub: preventedShare, tone: 'positive' },
    { label: 'Recovered', value: money(recovered, currency), sub: 'from carriers & partners', tone: 'accent' },
    { label: 'Realised loss', value: money(realised, currency), sub: 'confirmed, written off', tone: 'critical' },
  ];

  return (
    <div className="uo-page-stack" data-operations-surface="loss-ledger">
      <div className="uo-kpi-grid">
        {kpis.map((kpi) => (
          <section className="uo-kpi" key={kpi.label}>
            <span>{kpi.label}</span>
            <strong data-tone={kpi.tone}>{kpi.value}</strong>
            <small>{kpi.sub}</small>
          </section>
        ))}
      </div>
      <p className="uo-scope-note">{aggregate.source === 'canonical' ? `${aggregate.definitionVersion} · ${aggregate.timeBasis.replaceAll('_', ' ')} · currencies separated · unknown values withheld` : 'Canonical financial scope unavailable.'}</p>
      {recordLimitation ? <p className="uo-inline-warning">{recordLimitation}</p> : null}

      <section className="uo-card uo-loss-table">
        <header className="uo-loss-table-header">
          <div>
            <h2>Loss entries requiring financial review</h2>
            <p className="uo-scope-note">Open a row to trace source evidence, responsibility, recovery position and append-only ledger history.</p>
          </div>
          <nav className="uo-cause-filters" aria-label="Loss cause filters">
            <Link href={hrefForCause(null)} aria-current={!selectedCause ? 'page' : undefined}>All</Link>
            {groups.slice(0, 4).map((group) => (
              <Link key={group.key} href={hrefForCause(group.key)} aria-current={selectedCause === group.key ? 'page' : undefined}>
                {group.name}
              </Link>
            ))}
          </nav>
        </header>

        <div className="uo-loss-grid uo-table-head">
          <span>Case</span><span>Customer</span><span>Cause</span><span>Identified</span><span>Prevented</span><span>Recovered</span><span>Realised</span><span>Stage</span><span>Updated</span>
        </div>
        <div className="uo-table-body">
          {visibleRows.length ? visibleRows.map((row) => {
            const detailHref = row.detailHref ?? `/financials/losses/${row.id}`;
            const customer = row.customerName ?? 'Customer unavailable';
            const rowIdentified = row.realisedLossMinor ?? row.estimatedLossMinor;
            const rowPrevented = row.preventedMinor ?? (row.preventionOnly ? rowIdentified : null);
            return (
              <Link className="uo-loss-grid uo-table-row" href={detailHref} key={row.id}>
                <span className="uo-mono">{shortRef(row.caseReference, row.supportPayoutCaseId ?? row.id)}</span>
                <span className="uo-person"><i>{initials(row.customerName)}</i><b title={customer}>{customer}</b></span>
                <span>{rowCause(row).name}</span>
                <span data-align="right">{money(rowIdentified, row.currency)}</span>
                <span data-align="right" data-tone={rowPrevented != null ? 'positive' : undefined}>{signedMoney(rowPrevented, row.currency)}</span>
                <span data-align="right" data-tone={row.recoveredMinor != null ? 'accent' : undefined}>{signedMoney(row.recoveredMinor, row.currency)}</span>
                <span data-align="right" data-tone={row.realisedLossMinor != null ? 'critical' : undefined}>{money(row.realisedLossMinor, row.currency)}</span>
                <span><i className="uo-stage" data-stage={stageFor(row).toLowerCase()}>{stageFor(row)}</i></span>
                <span className="uo-muted">{row.updatedAt ? formatDateMode(row.updatedAt, 'recent') : '—'}</span>
              </Link>
            );
          }) : (
            <div className="uo-empty">
              <strong>No loss entries match this cause</strong>
              <span>The underlying ledger has not been changed.</span>
            </div>
          )}
        </div>

        <div className="uo-loss-grid uo-table-total">
          <span>Totals</span><span /><span />
          <span>{money(identified, currency)}</span>
          <span data-tone="positive">{signedMoney(prevented, currency)}</span>
          <span data-tone="accent">{signedMoney(recovered, currency)}</span>
          <span data-tone="critical">{money(realised, currency)}</span>
          <span>{formatNumber(filteredRows.length)} entries</span><span />
        </div>

        <footer className="uo-table-footer">
          <span>Sorted by updated · — means nothing recorded yet, {currency ? money(0, currency) : '0'} means a verified zero</span>
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredRows.length}
            previousHref={currentPage > 1 ? hrefForPage(currentPage - 1) : undefined}
            nextHref={currentPage < pageCount ? hrefForPage(currentPage + 1) : undefined}
          />
        </footer>
      </section>

      <details className="uo-card uo-secondary-analysis">
        <summary>
          <span><strong>Analyse realised loss by cause</strong><small>Secondary view · {currency ?? 'currency unavailable'} · {rangeLabel.toLowerCase()}</small></span>
          <span>Show chart</span>
        </summary>
        <div className="uo-loss-position">
          <header className="uo-card-header uo-card-header--split">
            <div>
              <h2>Where the loss sits</h2>
              <p>Realised loss by cause · {currency ?? 'Currency unavailable'} · Europe/London · {rangeLabel.toLowerCase()} against the prior 30 days</p>
            </div>
            <div className="uo-legend" aria-label="Chart legend">
              <span><i data-tone="critical" />Confirmed</span>
              <span><i data-tone="accent" />Still recoverable</span>
              <span><i data-tone="prior" />Prior 30 days</span>
            </div>
          </header>
          <LossCauseChart groups={groups} currency={currency} href="/financials/reports/loss-causes" />
        </div>
      </details>
    </div>
  );
}
