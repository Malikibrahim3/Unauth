'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SourceBadge } from '@/components/sources/SourceBadge';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';
import { DataTable, EmptyState, SegmentedControl, StatusBadge } from '@/components/ui';

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
  recoverableMinor: number | null;
  recoveredMinor: number | null;
  currency: string | null;
  source: string | null;
  freshness: FreshnessState;
  detailHref?: string;
  derived?: boolean;
};

type ViewKey = 'confirmed' | 'estimated' | 'recoverable' | 'prevented' | 'written_off' | 'all';

const VIEWS: Array<{ key: ViewKey; label: string; match: (row: LossLedgerRow) => boolean }> = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'confirmed', label: 'Confirmed', match: (r) => r.financialState === 'confirmed' && !r.writtenOff },
  { key: 'estimated', label: 'Estimated', match: (r) => r.financialState === 'estimated' && !r.writtenOff },
  { key: 'recoverable', label: 'Recoverable', match: (r) => r.recoverability === 'recoverable' || r.recoverability === 'eligible_to_chase' },
  { key: 'prevented', label: 'Prevented', match: (r) => r.preventionOnly },
  { key: 'written_off', label: 'Written off', match: (r) => r.writtenOff },
];

// Fixed 'en-GB' locale so server and client render identical strings (avoids
// hydration mismatches from Intl's default-locale variance).
function formatMinor(minor: number | null, currency: string | null): string {
  return formatMinorCurrencyNullable(minor, currency);
}


export function LossLedger({ rows }: { rows: LossLedgerRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>('all');
  const counts = useMemo(() => {
    const map = {} as Record<ViewKey, number>;
    for (const v of VIEWS) map[v.key] = rows.filter(v.match).length;
    return map;
  }, [rows]);
  const visible = useMemo(() => rows.filter(VIEWS.find((v) => v.key === view)!.match), [rows, view]);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl aria-label="Loss views" value={view} onValueChange={(value) => setView(value as ViewKey)} items={VIEWS.map((v) => ({ value: v.key, label: <>{v.label}<span className="ml-1.5 text-xs text-[var(--ua-text-tertiary)]">{counts[v.key]}</span></> }))} />

      {visible.length === 0 ? (
        <EmptyState variant="compact" title="No loss records in this view." />
      ) : (
        <DataTable
          rows={visible}
          getRowKey={(row) => row.id}
          density="compact"
          onRowClick={(row) => router.push(row.detailHref ?? `/losses/${row.id}`)}
          rowTestId="loss-row"
          emptyState={<EmptyState variant="compact" title="No loss records in this view" />}
          columns={[
            {
              key: 'category',
              header: 'Category',
              render: (row) => <span className="font-medium">{label('lossCategory', row.category)}{row.derived ? <span className="ml-2 text-xs text-[var(--warning)]">Reconciliation pending</span> : null}</span>,
            },
            {
              key: 'attribution',
              header: 'Attribution',
              render: (row) => row.attribution ? label('attribution', row.attribution) : '—',
            },
            {
              key: 'owner',
              header: 'Owner',
              render: (row) => row.counterpartyName ?? (row.counterpartyType ? label('counterparty', row.counterpartyType) : '—'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge family="lossStatus" value={row.status} size="sm" />,
            },
            {
              key: 'loss',
              header: 'Realised / estimated loss',
              align: 'right' as const,
              render: (row) => <span className="tabular-nums">{formatMinor(row.realisedLossMinor ?? row.estimatedLossMinor, row.currency)}</span>,
            },
            {
              key: 'recoverable',
              header: 'Recoverable',
              align: 'right' as const,
              render: (row) => <span className="tabular-nums">{formatMinor(row.recoverableMinor, row.currency)}</span>,
            },
            {
              key: 'source',
              header: 'Source',
              render: (row) => <div className="flex items-center gap-2"><SourceBadge source={row.source} /><FreshnessIndicator state={row.freshness} label="" /></div>,
            },
          ]}
        />
      )}
    </div>
  );
}
