"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CustomerPreviewDrawer } from "@/components/customers/CustomerPreviewDrawer";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export type CustomerMetricCoverage = "complete" | "partial" | "unavailable";

interface CustomerRow {
  id: string;
  primary_email: string | null;
  names: string[] | null;
  total_orders: number | null;
  order_coverage: CustomerMetricCoverage;
  total_spent: number | null;
  total_spent_currency: string | null;
  has_mixed_currency: boolean;
  payout_cases_total: number | null;
  payout_cases_open: number | null;
  case_coverage: CustomerMetricCoverage;
  has_refund_case: boolean | null;
  has_chargeback_case: boolean | null;
  last_order_at: string | null;
}

interface CustomersTableClientProps {
  rows: CustomerRow[];
}

function customerInitials(row: CustomerRow) {
  const source = row.names?.[0] || row.primary_email || "Customer";
  return source.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function observedCount(value: number | null, coverage: CustomerMetricCoverage) {
  if (coverage === 'complete') return value == null ? '—' : String(value);
  return value != null && value > 0 ? `${value} observed` : '—';
}

function lifetimeValue(row: CustomerRow) {
  if (row.has_mixed_currency) return 'Currencies separated';
  if (row.total_spent == null || !row.total_spent_currency) return '—';
  return formatCurrency(row.total_spent, row.total_spent_currency);
}

export default function CustomersTableClient({ rows }: CustomersTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");
  const [activePreviewId, setActivePreviewId] = useState<string | null>(selectedId);

  useEffect(() => setActivePreviewId(selectedId), [selectedId]);

  function setPreview(profileId: string | null) {
    setActivePreviewId(profileId);
    const next = new URLSearchParams(searchParams.toString());
    if (profileId) next.set("selected", profileId); else next.delete("selected");
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }

  return (
    <>
      <div className="uo-customers-table-scroll" data-testid="customers-table">
        <div className="uo-customers-table">
          <div className="uo-customers-grid uo-table-columns" aria-hidden="true">
            <span>Customer</span><span>Orders</span><span>Lifetime</span><span>Refunded</span><span>Refund rate vs cohort</span><span>Cases</span><span>Last order</span>
          </div>
          {rows.map((row) => {
            const name = row.names?.[0] ?? 'Unnamed customer';
            const cases = observedCount(row.payout_cases_total, row.case_coverage);
            const isSelected = activePreviewId === row.id;
            return <button
              type="button"
              className="uo-customers-grid uo-customer-row"
              key={row.id}
              data-testid="customer-row"
              data-row-key={row.id}
              onClick={() => setPreview(row.id)}
              data-selected={isSelected ? 'true' : undefined}
              style={isSelected ? { background: 'var(--uo-route-selection-fill)', boxShadow: 'inset 2px 0 0 var(--uo-route-selection-border)' } : undefined}
            >
              <span className="uo-person"><i>{customerInitials(row)}</i><b><strong>{name}</strong><small>{row.primary_email ?? 'Contact unavailable'}</small></b></span>
              <span data-align="right" title={`${row.order_coverage} order coverage`}>{observedCount(row.total_orders, row.order_coverage)}</span>
              <span data-align="right" title={row.has_mixed_currency ? 'Currencies are never combined' : `${row.order_coverage} order-value coverage`}>{lifetimeValue(row)}</span>
              <span data-align="right" className="uo-unavailable-value">—</span>
              <span className="uo-customer-rate" title="Refunded value is not available from the current customer read model"><i /><b /><em>Unavailable</em></span>
              <span style={{ overflow: 'visible', whiteSpace: 'normal' }}>{cases}{row.payout_cases_open && row.payout_cases_open > 0 ? <small style={{ overflow: 'visible', whiteSpace: 'normal', textOverflow: 'clip', background: 'var(--uo-route-surface-muted)', color: 'var(--uo-route-text-secondary)' }}>{row.payout_cases_open} open{row.case_coverage === 'complete' ? '' : ' · partial'}</small> : null}</span>
              <span className="uo-muted">{row.last_order_at ? formatDate(row.last_order_at) : row.order_coverage === 'complete' ? 'No order date' : 'Unavailable'}</span>
            </button>;
          })}
        </div>
      </div>
      <CustomerPreviewDrawer id={activePreviewId} onClose={() => setPreview(null)} />
    </>
  );
}
