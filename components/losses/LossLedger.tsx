'use client';

import Link from 'next/link';
import { DataTable, MoneyValue, OperationalState, StatusBadge } from '@/components/ui';
import { SourceBadge } from '@/components/sources/SourceBadge';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';
import { formatDateMode } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';

export type LossLedgerRow = {
  id: string;
  supportPayoutCaseId: string | null;
  caseReference?: string | null;
  customerName?: string | null;
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
  preventedMinor?: number | null;
  currency: string | null;
  source: string | null;
  freshness: FreshnessState;
  updatedAt?: string | null;
  detailHref?: string;
  derived?: boolean;
};

function sourceCell(row: LossLedgerRow) {
  if (row.source) return <SourceBadge source={row.source} />;
  return <span className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-tertiary)]">Source details unavailable</span>;
}

export function LossLedger({ rows }: { rows: LossLedgerRow[] }) {
  const columns = [
    {
      key: 'category',
      header: 'Loss',
      render: (row: LossLedgerRow) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-[var(--uo-route-text-primary)]">
            {label('lossCategory', row.category)}
            {row.derived ? <span className="ml-2 text-[length:var(--uo-route-text-caption-size)] font-normal text-[var(--uo-route-text-tertiary)]">Reconciliation pending</span> : null}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-secondary)]">
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
          <MoneyValue minorUnits={row.realisedLossMinor ?? row.estimatedLossMinor} currency={row.currency} reason="No verified confirmed or estimated loss is available" />
          {row.realisedLossMinor == null && row.estimatedLossMinor != null ? <span className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-tertiary)]">Estimated</span> : null}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net unrecovered',
      kind: 'currency' as const,
      render: (row: LossLedgerRow) => <MoneyValue minorUnits={row.netUnrecoveredMinor ?? null} currency={row.currency} reason="Recovered value is not reconciled for this loss" />,
    },
    {
      key: 'recoverable',
      header: 'Recoverable',
      kind: 'currency' as const,
      render: (row: LossLedgerRow) => <MoneyValue minorUnits={row.recoverableMinor} currency={row.currency} reason="Recoverability has not been confirmed" />,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row: LossLedgerRow) => (
        <span className="flex flex-col gap-1">
          <span className="text-[var(--uo-route-text-secondary)]">{row.updatedAt ? formatDateMode(row.updatedAt, 'recent') : 'Date unavailable'}</span>
          <FreshnessIndicator state={row.freshness} label={row.freshness === 'stale' ? 'Stale' : row.freshness === 'current' ? 'Current' : 'Freshness unknown'} />
        </span>
      ),
    },
  ];

  return (
    <div className="min-w-0">
      <DataTable
        flush
        persistentHeader
        aria-label="Loss ledger table"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        primaryColumnKey="category"
        getRowHref={(row) => row.detailHref ?? `/financials/losses/${row.id}`}
        emptyState={
          <div data-state-id="loss-chart-ledger-unavailable-states">
            <OperationalState
              kind="filtered-empty"
              title="No loss records match this scope"
              description="Change the range or clear source, status, and search controls. Unavailable financial stages have not been replaced with zero."
              action={<Link href="/financials/losses?range=all" className="ua-text-working-title text-[var(--uo-route-action-primary)] underline underline-offset-2">Open the all-time ledger</Link>}
            />
          </div>
        }
      />
    </div>
  );
}
