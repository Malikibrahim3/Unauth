'use client';

import { useEffect, useState } from 'react';
import ConfidenceGrade from '@/components/ConfidenceGrade';
import { ArrowRight, Search, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type CustomerRow = {
  email: string;
  orderCount: number;
  totalSpend: number;
  maxScore: number;
  grade: 'definite' | 'probable' | 'possible' | 'weak';
};

type AuditCustomerDetail = {
  customer: {
    email: string;
    names: string[];
    emails: string[];
    addresses: string[];
    ips: string[];
    cardLast4s: string[];
    clusterIds: string[];
    orderCount: number;
    directOrderCount: number;
    totalSpend: number;
    maxScore: number;
    grade: 'definite' | 'probable' | 'possible' | 'weak' | null;
    refundCount: number;
    chargebackCount: number;
    signals: string[];
  };
  orders: Array<{
    id: string;
    orderId: string | null;
    date: string | null;
    email: string | null;
    name: string | null;
    value: number | null;
    score: number;
    grade: 'definite' | 'probable' | 'possible' | 'weak' | null;
    clusterId: string | null;
    refundClaimed: boolean | null;
    refundReason: string | null;
    chargebackFiled: boolean | null;
    signals: string[];
    isDirectEmailMatch: boolean;
  }>;
};

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function AuditCustomerDrawer({
  runId,
  email,
  onClose,
}: {
  runId: string;
  email: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AuditCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    setDetail(null);

    fetch(`/api/audit/${runId}/customer?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AuditCustomerDetail) => setDetail(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId, email]);

  const open = !!email;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Audit customer profile"
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[680px] overflow-y-auto shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-heading-sm">Customer in this audit</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md" style={{ color: 'var(--icon-muted)' }} aria-label="Close profile">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading customer profile...</div>}
          {error && <div className="rounded-lg border p-4 text-sm" style={{ color: 'var(--risk-critical)', borderColor: 'var(--risk-critical-bd)', background: 'var(--risk-critical-bg)' }}>Could not load this audit customer.</div>}

          {detail && (
            <>
              <div className="rounded-lg border p-4" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{detail.customer.names[0] ?? detail.customer.email}</p>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{detail.customer.email}</p>
                  </div>
                  {detail.customer.grade && <ConfidenceGrade grade={detail.customer.grade} size="sm" />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Orders" value={detail.customer.orderCount.toLocaleString()} />
                  <Metric label="Spend" value={formatCurrency(detail.customer.totalSpend)} />
                  <Metric label="Max score" value={String(Math.round(detail.customer.maxScore))} />
                  <Metric label="Refunds" value={detail.customer.refundCount.toLocaleString()} />
                </div>
              </div>

              <Section title="Identity details">
                <KeyValues
                  rows={[
                    ['Emails', detail.customer.emails.join(', ') || '-'],
                    ['Names', detail.customer.names.join(', ') || '-'],
                    ['Addresses', detail.customer.addresses.join(' | ') || '-'],
                    ['IPs', detail.customer.ips.join(', ') || '-'],
                    ['Cards', detail.customer.cardLast4s.map((v) => `•••• ${v}`).join(', ') || '-'],
                    ['Clusters', detail.customer.clusterIds.join(', ') || '-'],
                  ]}
                />
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <Link
                    href={`/customers?email=${encodeURIComponent(detail.customer.email)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open full customer profile
                  </Link>
                </div>
              </Section>

              <Section title="Signals">
                {detail.customer.signals.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No stored signals for this customer.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.customer.signals.map((signal) => (
                      <span key={signal} className="rounded border px-2 py-1 text-xs" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>{signal}</span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={`Orders (${detail.orders.length})`}>
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)' }}>
                        <th className="text-left px-3 py-2 text-overline">Order</th>
                        <th className="text-left px-3 py-2 text-overline">Email</th>
                        <th className="text-right px-3 py-2 text-overline">Value</th>
                        <th className="text-right px-3 py-2 text-overline">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((order) => (
                        <tr key={order.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs" style={{ color: 'var(--text)' }}>{order.orderId ?? '-'}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(order.date)}</div>
                          </td>
                          <td className="px-3 py-2 text-xs font-mono" style={{ color: order.isDirectEmailMatch ? 'var(--text)' : 'var(--text-muted)' }}>{order.email ?? '-'}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(order.value)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">{Math.round(order.score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-overline">{title}</h3>
      {children}
    </section>
  );
}

function KeyValues({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
          <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
          <dd className="font-mono text-xs break-words" style={{ color: 'var(--text)' }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditCustomersTableClient({
  runId,
  rows,
  initialEmail = null,
}: {
  runId: string;
  rows: CustomerRow[];
  initialEmail?: string | null;
}) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(initialEmail);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('');

  const filtered = rows.filter((row) => {
    const matchSearch = !search || row.email.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !gradeFilter || row.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--icon-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full text-xs rounded-md pl-8 pr-8 py-2 focus:outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--icon-muted)' }}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="text-xs rounded-md px-3 py-2 focus:outline-none"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">All confidence</option>
          <option value="definite">Definite</option>
          <option value="probable">Probable</option>
          <option value="possible">Possible</option>
          <option value="weak">Weak</option>
        </select>
        {(search || gradeFilter) && (
          <button
            onClick={() => { setSearch(''); setGradeFilter(''); }}
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear filters
          </button>
        )}
        <span className="text-xs ml-auto" style={{ color: 'var(--text-subtle)' }}>
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Orders ↓</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Spend</th>
              <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Max score ↓</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.email} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
                    <ConfidenceGrade grade={row.grade} size="sm" />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{row.orderCount}</td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(row.totalSpend)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(row.maxScore)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setSelectedEmail(row.email)}
                    className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No customers match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked list */}
      <div className="sm:hidden space-y-2">
        {filtered.map((row) => (
          <div
            key={row.email}
            className="rounded-lg border px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
                <ConfidenceGrade grade={row.grade} size="sm" />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{row.orderCount} orders</span>
                <span>{formatCurrency(row.totalSpend)}</span>
                <span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>Score {Math.round(row.maxScore)}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmail(row.email)}
              className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
              style={{ color: 'var(--text)' }}
            >
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>No customers match your filters.</p>
        )}
      </div>

      <AuditCustomerDrawer
        runId={runId}
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </>
  );
}
