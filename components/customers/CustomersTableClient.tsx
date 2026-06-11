'use client';

import { useCallback, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';
import { DataTable } from '@/components/ui/DataTable';
import { Tooltip } from '@/components/ui/Tooltip';


interface CustomerRow {
  id: string;
  risk_score: number;
  risk_level: string;
  total_orders: number;
  total_refund_claims: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  primary_email: string | null;
  names: string[] | null;
  last_seen: string;
  investigation_status: string;
}

interface CustomersTableClientProps {
  rows: CustomerRow[];
}

export default function CustomersTableClient({ rows }: CustomersTableClientProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const openProfile = useCallback((profileId: string) => {
    requestAnimationFrame(() => setSelectedProfileId(profileId));
  }, []);
  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (p: CustomerRow) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {p.names?.[0] ?? '-'}
            </span>
          </div>
          <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{p.primary_email ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Identity confidence',
      render: (p: CustomerRow) => <ConfidenceBadge grade={riskLevelToNewGrade(p.risk_level)} size="sm" />,
    },
    {
      key: 'network',
      header: 'Stores seen',
      align: 'right' as const,
      render: (p: CustomerRow) => (
        <Tooltip content="Distinct stores this identity has been seen at. 2+ means a cross-store linked identity.">
          <span
            className="num"
            style={{
              fontFamily: 'var(--font-mono)',
              color: p.total_merchants_seen_at > 1 ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: p.total_merchants_seen_at > 1 ? 700 : 500,
            }}
          >
            {p.total_merchants_seen_at}
          </span>
        </Tooltip>
      ),
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
      render: (p: CustomerRow) => <span className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{p.total_refund_claims}</span>,
    },
    {
      key: 'open',
      header: '',
      align: 'right' as const,
      render: (p: CustomerRow) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent)' }}
          onClick={(e) => {
            e.stopPropagation();
            openProfile(p.id);
          }}
        >
          View <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <>
      {/* ── Desktop table (sm+) ─────────────────────────────── */}
      <div
        className="hidden sm:block overflow-hidden border"
        data-testid="customers-table"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)', borderRadius: 4 }}
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => openProfile(row.id)}
          rowTestId="customer-row"
          selectedKey={selectedProfileId ?? undefined}
          density="relaxed"
        />
      </div>

      {/* ── Mobile card list (<sm) ───────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {rows.map((p) => (
          <button
            type="button"
            key={p.id}
            className="p-4 w-full text-left cursor-pointer transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}
            onClick={() => openProfile(p.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.names?.[0] ?? '-'}</span>
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{p.primary_email ?? '-'}</p>
              </div>
              <ConfidenceBadge grade={riskLevelToNewGrade(p.risk_level)} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span><span className="font-semibold font-mono" style={{ color: p.total_merchants_seen_at > 1 ? 'var(--accent)' : 'var(--text)' }}>{p.total_merchants_seen_at}</span> stores seen</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.total_orders}</span> orders</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.total_refund_claims}</span> refunds</span>
            </div>
            <div className="mt-3 flex justify-end text-xs font-semibold" style={{ color: 'var(--text)' }}>
              <span className="inline-flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <CustomerIntelligenceDrawer
        profileId={selectedProfileId}
        open={selectedProfileId !== null}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  );
}
