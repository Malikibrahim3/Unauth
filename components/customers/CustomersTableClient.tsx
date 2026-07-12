'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PanelCard, StatusBadge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/format';

interface CustomerRow {
  id: string;
  primary_email: string | null;
  names: string[] | null;
  total_orders: number;
  total_spent: number;
  /** All-time payout case count for this customer. */
  payout_cases_total: number;
  /** Payout cases currently open (pending / open / escalated). */
  payout_cases_open: number;
  last_order_at: string | null;
}

interface CustomersTableClientProps {
  rows: CustomerRow[];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OpenCasesBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <StatusBadge variant="held" className="px-1.5 py-0.5 text-[11px] font-semibold">
      {count} open
    </StatusBadge>
  );
}

export default function CustomersTableClient({ rows }: CustomersTableClientProps) {
  const router = useRouter();

  const openProfile = (profileId: string) => {
    router.push(`/customers/${profileId}`);
  };

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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{p.primary_email ?? '-'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right' as const,
      render: (p: CustomerRow) => <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{p.total_orders}</span>,
    },
    {
      key: 'spent',
      header: 'Total spent',
      align: 'right' as const,
      render: (p: CustomerRow) => (
        <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>
          {/* No currency field is tracked on source_customers.total_spent (raw Shopify aggregate); defaults to USD. */}
          {p.total_spent > 0 ? formatCurrency(p.total_spent) : '—'}
        </span>
      ),
    },
    {
      key: 'cases',
      header: 'Payout cases',
      align: 'right' as const,
      render: (p: CustomerRow) => (
        <span className="inline-flex items-center gap-1.5">
          <OpenCasesBadge count={p.payout_cases_open} />
          <span className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {p.payout_cases_total}
          </span>
        </span>
      ),
    },
    {
      key: 'lastOrder',
      header: 'Last order',
      align: 'right' as const,
      render: (p: CustomerRow) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(p.last_order_at)}</span>
      ),
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
          density="relaxed"
        />
      </div>

      {/* ── Mobile card list (<sm) ───────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {rows.map((p) => (
          <PanelCard
            as="button"
            type="button"
            key={p.id}
            variant="app"
            className="w-full cursor-pointer p-4 text-left transition-colors"
            onClick={() => openProfile(p.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.names?.[0] ?? '-'}</span>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{p.primary_email ?? '-'}</p>
              </div>
              <OpenCasesBadge count={p.payout_cases_open} />
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.total_orders}</span> orders</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span><span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{p.payout_cases_total}</span> payout cases</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>Last order {formatDate(p.last_order_at)}</span>
            </div>
            <div className="mt-3 flex justify-end text-xs font-semibold" style={{ color: 'var(--text)' }}>
              <span className="inline-flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </PanelCard>
        ))}
      </div>
    </>
  );
}
