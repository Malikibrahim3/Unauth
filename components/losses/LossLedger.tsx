'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SourceBadge } from '@/components/sources/SourceBadge';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import { label } from '@/lib/ui/labels';
import { EmptyState, StatusBadge } from '@/components/ui';

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
  const [view, setView] = useState<ViewKey>('all');
  const counts = useMemo(() => {
    const map = {} as Record<ViewKey, number>;
    for (const v of VIEWS) map[v.key] = rows.filter(v.match).length;
    return map;
  }, [rows]);
  const visible = useMemo(() => rows.filter(VIEWS.find((v) => v.key === view)!.match), [rows, view]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Loss views">
        {VIEWS.map((v) => {
          const active = v.key === view;
          return (
            <button
              type="button"
              key={v.key}
              role="tab"
              aria-selected={active}
              onClick={() => setView(v.key)}
              className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                color: active ? 'var(--ua-text-primary)' : 'var(--ua-text-secondary)',
                backgroundColor: active ? 'var(--ua-surface-muted)' : 'transparent',
              }}
            >
              {v.label}
              <span className="ml-1.5" style={{ color: 'var(--ua-text-tertiary)' }}>{counts[v.key]}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]">
          <EmptyState
            title="No loss records yet"
            description="Loss records appear after a payout case has a confirmed or estimated loss. Connect your sources to keep the ledger current."
            action={<Link href="/integrations" className="inline-flex h-9 items-center rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-sm font-semibold text-[var(--ua-action-primary-fg)]">Review integrations</Link>}
          />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--ua-text-tertiary)' }}>
          No loss records in this view.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--ua-text-tertiary)', textAlign: 'left' }}>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Attribution</th>
                <th className="py-2 pr-4 font-medium">Owner</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right whitespace-nowrap">Est. loss</th>
                <th className="py-2 pr-4 font-medium text-right">Recoverable</th>
                <th className="py-2 pr-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const href = row.detailHref ?? `/losses/${row.id}`;
                return (
                <tr
                  key={row.id}
                  className="hover:bg-[var(--ua-surface-hover)]"
                  style={{ borderTop: '1px solid var(--ua-border-subtle)' }}
                >
                  <td className="py-2 pr-4 font-medium" style={{ color: 'var(--ua-text-primary)' }}>
                    <Link
                      href={href}
                      className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-border-focus)]"
                    >
                      {label('lossCategory', row.category)}
                    </Link>
                    {row.derived ? <span className="ml-2 text-xs text-[var(--ua-warning)]">Reconciliation pending</span> : null}
                  </td>
                  <td className="py-2 pr-4" style={{ color: 'var(--ua-text-secondary)' }}>{row.attribution ? label('attribution', row.attribution) : '—'}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--ua-text-secondary)' }}>
                    {row.counterpartyName ?? (row.counterpartyType ? label('counterparty', row.counterpartyType) : '—')}
                  </td>
                  <td className="py-2 pr-4"><StatusBadge family="lossStatus" value={row.status} size="sm" /></td>
                  <td className="py-2 pr-4 text-right tabular-nums" style={{ color: 'var(--ua-text-primary)' }}>
                    {formatMinor(row.realisedLossMinor ?? row.estimatedLossMinor, row.currency)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatMinor(row.recoverableMinor, row.currency)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <SourceBadge source={row.source} />
                      <FreshnessIndicator state={row.freshness} label="" />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
