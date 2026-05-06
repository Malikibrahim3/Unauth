'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge, type ConfidenceGradeValue } from '@/components/ui/ConfidenceBadge';
import { ArrowRight, Search, X, ExternalLink } from 'lucide-react';

/** Maps legacy grade strings to new A-F confidence values */
function legacyGradeToNew(g: 'definite' | 'probable' | 'possible' | 'weak' | null | undefined): ConfidenceGradeValue {
  switch (g) {
    case 'definite': return 'A';
    case 'probable': return 'B';
    case 'possible': return 'C';
    case 'weak':     return 'D';
    default:         return 'C';
  }
}
import Link from 'next/link';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';

type CustomerRow = {
  email: string;
  orderCount: number;
  totalSpend: number;
  maxScore: number;
  grade: 'definite' | 'probable' | 'possible' | 'weak';
};

type AuditCustomerDetail = {
  customer: {
    id: string | null;
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

function riskBadgeStyle(level: string | null): React.CSSProperties {
  const t = ['low', 'medium', 'high', 'critical'].includes(level ?? '') ? level! : 'low';
  return { background: `var(--risk-${t}-bg)`, color: `var(--risk-${t})`, border: `1px solid var(--risk-${t}-bd)` };
}

function AuditCustomerDrawer({
  runId,
  email,
  onClose,
  onProfileResolved,
}: {
  runId: string;
  email: string | null;
  onClose: () => void;
  onProfileResolved?: (profileId: string) => void;
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
      .then((data: AuditCustomerDetail) => {
        setDetail(data);
        // Auto-upgrade: if this customer has a persistent profile, switch to the full drawer
        if (data.customer.id) {
          onProfileResolved?.(data.customer.id);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId, email]); // eslint-disable-line react-hooks/exhaustive-deps

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
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[624px] overflow-y-auto shadow-2xl transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-heading-sm">Customer Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--icon-muted)' }} aria-label="Close panel">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="h-20 rounded-xl" style={{ background: 'var(--bg-subtle)' }} />
              <div className="h-4 rounded w-1/2" style={{ background: 'var(--bg-subtle)' }} />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg" style={{ background: 'var(--bg-subtle)' }} />)}
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border p-4 text-sm" style={{ color: 'var(--risk-critical)', borderColor: 'var(--risk-critical-bd)', background: 'var(--risk-critical-bg)' }}>
              Could not load customer data.
            </div>
          )}

          {detail && (
            <>
              {/* Confidence block */}
              <div className="rounded-xl border p-4" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{detail.customer.names[0] ?? detail.customer.email}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail.customer.email}</p>
                  </div>
                  {detail.customer.grade && <ConfidenceBadge grade={legacyGradeToNew(detail.customer.grade)} size="sm" />}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Orders', value: detail.customer.orderCount },
                    { label: 'Spend', value: formatCurrency(detail.customer.totalSpend) },
                    { label: 'Score', value: Math.round(detail.customer.maxScore) },
                    { label: 'Refunds', value: detail.customer.refundCount },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{value}</p>
                    </div>
                  ))}
                </div>
                {detail.customer.id && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <Link
                      href={`/customers/${detail.customer.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open full customer profile
                    </Link>
                  </div>
                )}
              </div>

              {/* Identity details */}
              <div>
                <h3 className="text-overline mb-3">Identity details</h3>
                <dl className="space-y-2 text-sm">
                  {([
                    ['Emails', detail.customer.emails.join(', ') || '—'],
                    ['Names', detail.customer.names.join(', ') || '—'],
                    ['Addresses', detail.customer.addresses.join(' · ') || '—'],
                    ['IPs', detail.customer.ips.join(', ') || '—'],
                    ['Cards', detail.customer.cardLast4s.map((v) => `•••• ${v}`).join(', ') || '—'],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="grid gap-2" style={{ gridTemplateColumns: '100px 1fr' }}>
                      <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                      <dd className="font-mono text-xs break-words" style={{ color: 'var(--text)' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Signals / flags */}
              {detail.customer.signals.length > 0 && (
                <div>
                  <h3 className="text-overline mb-3">Signals</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.customer.signals.map((signal) => (
                      <span key={signal} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{signal}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Order history */}
              <div>
                <h3 className="text-overline mb-3">Order history ({detail.orders.length})</h3>
                <div className="space-y-2">
                  {detail.orders.map((order) => (
                    <div key={order.id} className="rounded-lg p-3" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>{order.orderId ?? '—'}</span>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold uppercase shrink-0"
                          style={riskBadgeStyle(order.grade === 'definite' ? 'critical' : order.grade === 'probable' ? 'high' : order.grade === 'possible' ? 'medium' : 'low')}
                        >
                          {order.grade ?? 'low'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span style={{ color: 'var(--text-muted)' }}>{formatDate(order.date)}</span>
                        <div className="flex items-center gap-3">
                          {order.refundClaimed && (
                            <span className="font-medium" style={{ color: 'var(--risk-high)' }}>Refund claimed{order.refundReason ? ` · ${order.refundReason}` : ''}</span>
                          )}
                          {order.chargebackFiled && (
                            <span className="font-medium" style={{ color: 'var(--risk-critical)' }}>Chargeback</span>
                          )}
                          <span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(order.value)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
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
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [upgradeProfileId, setUpgradeProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('');

  function openDrawerForEmail(email: string) {
    setSelectedEmail(email);
    setUpgradeProfileId(null);
  }

  function closeDrawer() {
    setSelectedEmail(null);
    setUpgradeProfileId(null);
  }

  // Resolve initialEmail on mount
  useEffect(() => {
    if (initialEmail) openDrawerForEmail(initialEmail);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              <tr
                key={row.email}
                className="border-b transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                onClick={() => openDrawerForEmail(row.email)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
                    <ConfidenceBadge grade={legacyGradeToNew(row.grade)} size="sm" />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{row.orderCount}</td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(row.totalSpend)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round(row.maxScore)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDrawerForEmail(row.email); }}
                      className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
                      style={{ color: 'var(--text)' }}
                      aria-label={`Open customer drawer for ${row.email}`}
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
            className="rounded-lg border px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            onClick={() => openDrawerForEmail(row.email)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{row.email}</span>
                <ConfidenceBadge grade={legacyGradeToNew(row.grade)} size="sm" />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{row.orderCount} orders</span>
                <span>{formatCurrency(row.totalSpend)}</span>
                <span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>Score {Math.round(row.maxScore)}</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); openDrawerForEmail(row.email); }}
              className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold hover:underline"
              style={{ color: 'var(--text)' }}
              aria-label={`Open customer drawer for ${row.email}`}
            >
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>No customers match your filters.</p>
        )}
      </div>

      {/* AuditCustomerDrawer opens immediately; auto-hides when upgradeProfileId is set */}
      <AuditCustomerDrawer
        runId={runId}
        email={upgradeProfileId ? null : selectedEmail}
        onClose={closeDrawer}
        onProfileResolved={(id) => setUpgradeProfileId(id)}
      />
      {/* CustomerIntelligenceDrawer shows when a persistent profile is found */}
      <CustomerIntelligenceDrawer
        profileId={upgradeProfileId}
        onClose={closeDrawer}
      />
    </>
  );
}
