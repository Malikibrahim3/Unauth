'use client';

import { useState } from 'react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';


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
  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (p: CustomerRow) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {p.names?.[0] ?? '—'}
            </span>
            {p.on_watchlist && <Badge tone="neutral" size="sm">Watched</Badge>}
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.primary_email ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (p: CustomerRow) => <ConfidenceBadge grade={riskLevelToNewGrade(p.risk_level)} size="sm" />,
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right' as const,
      render: (p: CustomerRow) => <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(p.risk_score) / 100}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right' as const,
      render: (p: CustomerRow) => <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{p.total_orders}</span>,
    },
    {
      key: 'refunds',
      header: 'Refunds',
      align: 'right' as const,
      render: (p: CustomerRow) => <span className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.total_refund_claims}</span>,
    },
    {
      key: 'open',
      header: '',
      align: 'right' as const,
      render: () => <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1814' }}>View ›</span>,
    },
  ];

  return (
    <>
      {/* ── Desktop table (sm+) ─────────────────────────────── */}
      <div className="hidden sm:block overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 4 }}>
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setSelectedProfileId(row.id)}
          selectedKey={selectedProfileId ?? undefined}
        />
      </div>

      {/* ── Mobile card list (<sm) ───────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="p-4 cursor-pointer transition-colors"
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
                View ›
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
