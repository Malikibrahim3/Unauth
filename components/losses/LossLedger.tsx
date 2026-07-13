'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SourceBadge } from '@/components/sources/SourceBadge';
import { FreshnessIndicator, type FreshnessState } from '@/components/sources/FreshnessIndicator';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

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

function titleCase(value: string | null): string {
  if (!value) return '—';
  return value.split(/[_\s]+/).map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(' ');
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
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--surface-muted, rgba(0,0,0,0.06))' : 'transparent',
              }}
            >
              {v.label}
              <span className="ml-1.5" style={{ color: 'var(--text-tertiary)' }}>{counts[v.key]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No loss records in this view.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-tertiary)', textAlign: 'left' }}>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Attribution</th>
                <th className="py-2 pr-4 font-medium">Owner</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Realised / estimated loss</th>
                <th className="py-2 pr-4 font-medium text-right">Recoverable</th>
                <th className="py-2 pr-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.08))' }}>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}><Link href={row.detailHref ?? `/losses/${row.id}`} className="font-medium underline underline-offset-2">{titleCase(row.category)}</Link>{row.derived ? <span className="ml-2 text-xs text-[var(--warning)]">Reconciliation pending</span> : null}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{titleCase(row.attribution)}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>
                    {row.counterpartyName ?? titleCase(row.counterpartyType)}
                  </td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{titleCase(row.status)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
