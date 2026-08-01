'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, FilterChip, OperationalState, StatusBadge } from '@/components/ui';
import { SourceBadge } from '@/components/sources/SourceBadge';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';
import { formatDateMode, formatMinorCurrencyNullable } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';

export type LossLedgerRow = {
  id: string;
  supportPayoutCaseId: string | null;
  category: string;
  attribution: string | null;
  counterpartyType: string | null;
  counterpartyName: string | null;
  status: string;
  recoverability: string | null;
  financialState: string;
  preventionOnly: boolean;
  writtenOff: boolean;
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  netUnrecoveredMinor?: number | null;
  recoverableMinor: number | null;
  recoveredMinor: number | null;
  currency: string | null;
  source: string | null;
  freshness: FreshnessState;
  updatedAt?: string | null;
  detailHref?: string;
  derived?: boolean;
};

type ViewKey = 'confirmed' | 'estimated' | 'recoverable' | 'prevented' | 'written_off' | 'all';

const VIEWS: Array<{ key: ViewKey; label: string; match: (row: LossLedgerRow) => boolean }> = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'confirmed', label: 'Confirmed', match: (row) => row.financialState === 'confirmed' && !row.writtenOff },
  { key: 'estimated', label: 'Estimated', match: (row) => row.financialState === 'estimated' && !row.writtenOff },
  { key: 'recoverable', label: 'Recoverable', match: (row) => (row.recoverability === 'recoverable' || row.recoverability === 'eligible_to_chase') && !row.writtenOff },
  { key: 'prevented', label: 'Prevented', match: (row) => row.preventionOnly },
  { key: 'written_off', label: 'Written off', match: (row) => row.writtenOff },
];

function viewForKey(key: ViewKey): (row: LossLedgerRow) => boolean {
  return VIEWS.find((view) => view.key === key)?.match ?? VIEWS[0].match;
}

function causeKey(row: LossLedgerRow): string {
  return row.attribution ?? row.category ?? 'unattributed';
}

function matchesAttribution(
  row: LossLedgerRow,
  selectedAttribution: string | null,
  otherAttributionKeys: string[],
): boolean {
  if (!selectedAttribution) return true;
  const key = causeKey(row);
  if (selectedAttribution === '__other') return otherAttributionKeys.includes(key);
  return key === selectedAttribution;
}

function sourceCell(row: LossLedgerRow) {
  if (row.source) return <SourceBadge source={row.source} />;
  return <span className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">Source details unavailable</span>;
}

export function LossLedger({
  rows,
  selectedAttribution = null,
  otherAttributionKeys = [],
  initialView = 'all',
}: {
  rows: LossLedgerRow[];
  selectedAttribution?: string | null;
  otherAttributionKeys?: string[];
  initialView?: ViewKey;
}) {
  const [view, setView] = useState<ViewKey>(initialView);
  useEffect(() => setView(initialView), [initialView]);

  const causeScopedRows = useMemo(
    () => rows.filter((row) => matchesAttribution(row, selectedAttribution, otherAttributionKeys)),
    [otherAttributionKeys, rows, selectedAttribution],
  );
  const visible = useMemo(
    () => causeScopedRows.filter(viewForKey(view)),
    [causeScopedRows, view],
  );

  const columns = [
    {
      key: 'category',
      header: 'Loss',
      render: (row: LossLedgerRow) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-[var(--ua-text-primary)]">
            {label('lossCategory', row.category)}
            {row.derived ? <span className="ml-2 text-[length:var(--ua-text-caption-size)] font-normal text-[var(--ua-text-tertiary)]">Reconciliation pending</span> : null}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">
              {row.attribution ? label('attribution', row.attribution) : 'Attribution not yet assigned'}
            </span>
            {sourceCell(row)}
          </span>
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row: LossLedgerRow) => row.counterpartyName ?? (row.counterpartyType ? label('counterparty', row.counterpartyType) : 'Not yet known'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: LossLedgerRow) => <StatusBadge family="lossStatus" value={row.status} size="sm" />,
    },
    {
      key: 'loss',
      header: 'Loss value',
      kind: 'currency' as const,
      render: (row: LossLedgerRow) => (
        <span className="flex flex-col items-end gap-0.5 tabular-nums">
          <span>{formatMinorCurrencyNullable(row.realisedLossMinor ?? row.estimatedLossMinor, row.currency)}</span>
          {row.realisedLossMinor == null && row.estimatedLossMinor != null ? <span className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">Estimated</span> : null}
        </span>
      ),
    },
    {
      key: 'recoverable',
      header: 'Recoverable',
      kind: 'currency' as const,
      render: (row: LossLedgerRow) => <span className="tabular-nums">{formatMinorCurrencyNullable(row.recoverableMinor, row.currency)}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row: LossLedgerRow) => (
        <span className="flex flex-col gap-1">
          <span className="text-[var(--ua-text-secondary)]">{row.updatedAt ? formatDateMode(row.updatedAt, 'recent') : 'Date unavailable'}</span>
          <FreshnessIndicator state={row.freshness} label={row.freshness === 'stale' ? 'Stale' : row.freshness === 'current' ? 'Current' : 'Freshness unknown'} />
        </span>
      ),
    },
  ];

  return (
    <div className="min-w-0">
      <nav className="flex flex-wrap items-center gap-1 px-4 py-3" aria-label="Loss ledger views">
        {VIEWS.map((item) => (
          <FilterChip
            key={item.key}
            active={view === item.key}
            onClick={() => setView(item.key)}
          >
            {item.label}
          </FilterChip>
        ))}
      </nav>
      <DataTable
        flush
        aria-label="Loss ledger table"
        columns={columns}
        rows={visible}
        getRowKey={(row) => row.id}
        primaryColumnKey="category"
        getRowHref={(row) => row.detailHref ?? `/losses/${row.id}`}
        emptyState={
          rows.length === 0 ? (
            <OperationalState
              kind="zero"
              title="No loss records yet"
              description="Loss records appear after a case has a confirmed or estimated loss. Connect a source to keep the ledger current."
              action={<Link href="/integrations" className="font-semibold text-[var(--ua-action-primary)] underline underline-offset-2">Review integrations</Link>}
            />
          ) : (
            <OperationalState
              kind="filtered-empty"
              title="No loss records match this view"
              description="Choose another ledger view or clear the cause filter to see the available records."
            />
          )
        }
      />
    </div>
  );
}
