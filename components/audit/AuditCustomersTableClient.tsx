'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge, type ConfidenceGradeValue } from '@/components/ui/ConfidenceBadge';
import { ArrowRight, Search, X } from 'lucide-react';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

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

// Identity confidence grade passthrough (the drawer renders grades, not risk tiers).
function gradeToRiskLevel(grade: string | null): string {
  switch (grade) {
    case 'definite':
    case 'probable':
    case 'possible':
      return grade;
    default:
      return 'weak';
  }
}

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

/** Build a full panel from the audit API response */
function auditDetailToPanel(detail: AuditCustomerDetail): CustomerIntelligencePanel {
  const { customer, orders } = detail;
  const claimCount = customer.refundCount + customer.chargebackCount;
  const sortedOrders = [...orders].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const firstSeen = sortedOrders[0]?.date ?? new Date().toISOString();
  const lastSeen = sortedOrders[sortedOrders.length - 1]?.date ?? new Date().toISOString();

  const parts: string[] = [];
  if (sortedOrders.length > 0) {
    const from = formatDateShort(firstSeen);
    const to = formatDateShort(lastSeen);
    parts.push(`This customer has ${customer.orderCount} recorded order${customer.orderCount !== 1 ? 's' : ''} between ${from} and ${to}.`);
  }
  if (claimCount > 0) parts.push(`${claimCount} refund or chargeback claim${claimCount !== 1 ? 's' : ''} on record.`);
  if (customer.signals.length > 0) parts.push(`Signals detected: ${customer.signals.slice(0, 4).join(', ')}.`);
  const narrative = parts.join(' ') || 'No additional signals detected in this audit.';

  return {
    profile: {
      id: customer.id ?? '',
      primary_email: customer.email,
      emails: customer.emails.length > 0 ? customer.emails : [customer.email],
      names: customer.names,
      addresses: customer.addresses,
      ips: customer.ips,
      card_last4s: customer.cardLast4s,
      phones: [],
      risk_score: customer.maxScore,
      risk_level: gradeToRiskLevel(customer.grade),
      fraud_flags: customer.signals,
      total_orders: customer.orderCount,
      total_refund_claims: customer.refundCount,
      total_chargebacks: customer.chargebackCount,
      total_merchants_seen_at: 1,
      refund_rate: customer.orderCount > 0 ? customer.refundCount / customer.orderCount : 0,
      fastest_claim_days: null,
      avg_claim_days: null,
      refund_acceleration_score: 0,
      first_seen: firstSeen,
      last_seen: lastSeen,
      profile_confidence: customer.maxScore,
      manually_reviewed: false,
      on_watchlist: false,
      watchlist_entry_id: null,
    },
    orderHistory: orders.map((order) => ({
      transactionId: order.id,
      orderId: order.orderId ?? order.id,
      orderDate: order.date,
      processedAt: order.date ?? new Date().toISOString(),
      email: order.email,
      name: order.name,
      address: null,
      ip: null,
      cardLast4: null,
      orderValue: order.value,
      fraudScore: order.score,
      riskLevel: gradeToRiskLevel(order.grade),
      fraudFlags: order.signals,
      refundStatus: null,
      refundRequested: order.refundClaimed ?? false,
      refundReason: order.refundReason,
      refundDate: null,
      refundAmount: null,
      returnRequested: false,
      chargebackFiled: order.chargebackFiled ?? false,
      chargebackDate: null,
      chargebackReasonCode: null,
    })),
    identityTimeline: [],
    linkedAccounts: [],
    narrative,
  };
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerResolving, setDrawerResolving] = useState(false);
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null);
  const [drawerPanel, setDrawerPanel] = useState<CustomerIntelligencePanel | null>(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('');

  async function openDrawerForRow(row: CustomerRow) {
    setDrawerOpen(true);
    setDrawerResolving(true);
    setDrawerProfileId(null);
    setDrawerPanel(null);

    try {
      const res = await fetch(`/api/audit/${runId}/customer?email=${encodeURIComponent(row.email)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail = (await res.json()) as AuditCustomerDetail;

      if (detail.customer.id) {
        setDrawerProfileId(detail.customer.id);
        setDrawerPanel(null);
      } else {
        setDrawerProfileId(null);
        setDrawerPanel(auditDetailToPanel(detail));
      }
    } catch {
      setDrawerOpen(false);
      setDrawerProfileId(null);
      setDrawerPanel(null);
    } finally {
      setDrawerResolving(false);
    }
  }

  function openDrawerForEmail(email: string) {
    const row = rows.find((r) => r.email === email);
    if (row) {
      openDrawerForRow(row);
    } else {
      // Email not in current page — open with a stub row
      openDrawerForRow({ email, orderCount: 0, totalSpend: 0, maxScore: 0, grade: 'weak' });
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerResolving(false);
    setDrawerProfileId(null);
    setDrawerPanel(null);
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
                onClick={() => openDrawerForRow(row)}
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
                    onClick={(e) => { e.stopPropagation(); openDrawerForRow(row); }}
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
            onClick={() => openDrawerForRow(row)}
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
              onClick={(e) => { e.stopPropagation(); openDrawerForRow(row); }}
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

      <CustomerIntelligenceDrawer
        open={drawerOpen}
        resolving={drawerResolving}
        profileId={drawerProfileId}
        prefetchedPanel={drawerPanel}
        onClose={closeDrawer}
      />
    </>
  );
}
