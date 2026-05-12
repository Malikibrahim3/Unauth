'use client';

import { useState } from 'react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';


interface CustomerRow {
  id: string;
  risk_score: number;
  risk_level: string;
  total_orders: number;
  total_refund_claims: number;
  refund_rate: number;
  primary_email: string | null;
  names: string[] | null;
  on_watchlist: boolean;
  last_seen: string;
  investigation_status: string;
}

interface CustomersTableClientProps {
  rows: CustomerRow[];
}

export default function CustomersTableClient({ rows }: CustomersTableClientProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  return (
    <>
      {/* ── Desktop table (sm+) ─────────────────────────────── */}
      <div className="hidden sm:block rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Risk</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Score</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Orders</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Refunds</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                onClick={() => setSelectedProfileId(p.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {p.names?.[0] ?? '—'}
                    </span>
                    {p.on_watchlist && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm border font-medium" style={{ background: 'var(--watchlist-bg)', color: 'var(--watchlist)', borderColor: 'var(--watchlist-bd)' }}>
                        watched
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.primary_email ?? '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <ConfidenceBadge grade={riskLevelToNewGrade(p.risk_level)} size="sm" />
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>
                  {Math.round(p.risk_score)}
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text)' }}>{p.total_orders}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{p.total_refund_claims}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProfileId(p.id); }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (<sm) ───────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-4 cursor-pointer transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={() => setSelectedProfileId(p.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.names?.[0] ?? '—'}</span>
                  {p.on_watchlist && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm border font-medium" style={{ background: 'var(--watchlist-bg)', color: 'var(--watchlist)', borderColor: 'var(--watchlist-bd)' }}>watched</span>
                  )}
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.primary_email ?? '—'}</p>
              </div>
              <ConfidenceBadge grade={riskLevelToNewGrade(p.risk_level)} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{Math.round(p.risk_score)}</span> score</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.total_orders}</span> orders</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.total_refund_claims}</span> refunds</span>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedProfileId(p.id); }}
                className="text-xs font-semibold hover:underline"
                style={{ color: 'var(--text)' }}
              >
                View →
              </button>
            </div>
          </div>
        ))}
      </div>

      <CustomerIntelligenceDrawer
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  );
}
