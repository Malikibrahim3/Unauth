"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronRight, Clock3, ReceiptText } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CustomerPreviewDrawer } from "@/components/customers/CustomerPreviewDrawer";

interface CustomerRow {
  id: string;
  primary_email: string | null;
  names: string[] | null;
  total_orders: number;
  total_spent: number;
  total_spent_currency: string | null;
  has_mixed_currency: boolean;
  /** All-time case count for this customer. */
  payout_cases_total: number;
  /** Cases currently open (pending / open / escalated). */
  payout_cases_open: number;
  last_order_at: string | null;
}

interface CustomersTableClientProps {
  rows: CustomerRow[];
}

function OpenCasesBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge tone="warning" size="sm" dot>{count} open</Badge>
  );
}

function customerInitials(row: CustomerRow) {
  const source = row.names?.[0] || row.primary_email || "Customer";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function CustomersTableClient({
  rows,
}: CustomersTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewValue = searchParams.get("preview");
  const previewId = previewValue?.startsWith("customer:")
    ? previewValue.slice(9)
    : null;
  const [activePreviewId, setActivePreviewId] = useState<string | null>(previewId);

  useEffect(() => {
    setActivePreviewId(previewId);
  }, [previewId]);

  const setPreview = (profileId: string | null) => {
    setActivePreviewId(profileId);
    const next = new URLSearchParams(searchParams.toString());
    if (profileId) next.set("preview", `customer:${profileId}`);
    else next.delete("preview");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (p: CustomerRow) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ua-surface-muted)] text-xs font-semibold text-[var(--ua-text-primary)] ring-1 ring-[var(--ua-border-subtle)]">
            {customerInitials(p)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--ua-text-primary)]">
              {p.names?.[0] ?? "Unnamed customer"}
            </div>
            <div className="truncate text-xs text-[var(--ua-text-secondary)]">
              {p.primary_email ?? "Contact unavailable"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <div className="text-right">
          <div className="num font-semibold">{p.total_orders}</div>
          <div className="mt-0.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">completed in store</div>
        </div>
      ),
    },
    {
      key: "spent",
      header: "Total spent",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <div className="text-right">
          <div className="num font-semibold">
            {p.has_mixed_currency
              ? "Mixed currencies"
              : p.total_spent_currency && p.total_spent > 0
                ? formatCurrency(p.total_spent, p.total_spent_currency)
                : "—"}
          </div>
          {!p.has_mixed_currency && p.total_spent_currency && p.total_orders > 0 ? (
            <div className="mt-0.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
              {formatCurrency(p.total_spent / p.total_orders, p.total_spent_currency)} avg. order
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "cases",
      header: "Cases",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5">
            <OpenCasesBadge count={p.payout_cases_open} />
            <span className="num font-semibold">{p.payout_cases_total}</span>
          </span>
          <span className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
            {p.total_orders > 0
              ? `${p.payout_cases_total} ${p.payout_cases_total === 1 ? "case" : "cases"} across ${p.total_orders} ${p.total_orders === 1 ? "order" : "orders"}`
              : "No order baseline"}
          </span>
        </div>
      ),
    },
    {
      key: "lastOrder",
      header: "Last order",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ua-text-secondary)]">
          <Clock3 className="h-3.5 w-3.5 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          {p.last_order_at ? formatDate(p.last_order_at) : "No order date"}
        </span>
      ),
    },
    {
      key: "open",
      header: "",
      align: "right" as const,
      render: () => (
        <ChevronRight
          className="ml-auto h-4 w-4 text-[var(--ua-text-tertiary)]"
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <>
      {/* ── Desktop table (sm+) ─────────────────────────────── */}
      <div
        className="hidden sm:block"
        data-testid="customers-table"
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setPreview(row.id)}
          primaryColumnKey="customer"
          primaryActionLabel={(row) => `Open preview for ${row.names?.[0] ?? 'customer'}`}
          rowTestId="customer-row"
          density="default"
          aria-label="Customers"
        />
      </div>

      {/* ── Mobile card list (<sm) ───────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {rows.map((p) => (
          <Card unstyled
            as="button"
            type="button"
            key={p.id}
            variant="panel"
            className="w-full cursor-pointer p-4 text-left transition-colors"
            onClick={() => setPreview(p.id)}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ua-surface-muted)] text-xs font-semibold ring-1 ring-[var(--ua-border-subtle)]">{customerInitials(p)}</span>
                <div className="min-w-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--ua-text-primary)" }}
                >
                  {p.names?.[0] ?? "-"}
                </span>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--ua-text-secondary)" }}
                >
                  {p.primary_email ?? "-"}
                </p>
                </div>
              </div>
              <OpenCasesBadge count={p.payout_cases_open} />
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-border-subtle)] text-xs">
              <div className="bg-[var(--ua-surface-primary)] p-2"><span className="block font-semibold text-[var(--ua-text-primary)]">{p.total_orders}</span><span className="text-[var(--ua-text-tertiary)]">Orders</span></div>
              <div className="bg-[var(--ua-surface-primary)] p-2"><span className="block font-semibold text-[var(--ua-text-primary)]">{p.payout_cases_total}</span><span className="text-[var(--ua-text-tertiary)]">Cases</span></div>
              <div className="bg-[var(--ua-surface-primary)] p-2"><span className="block truncate font-semibold text-[var(--ua-text-primary)]">{p.last_order_at ? formatDate(p.last_order_at) : "—"}</span><span className="text-[var(--ua-text-tertiary)]">Last order</span></div>
            </div>
            <div
              className="mt-3 flex justify-end text-xs font-semibold"
              style={{ color: "var(--ua-text-primary)" }}
            >
              <span className="inline-flex items-center gap-1">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                View <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </Card>
        ))}
      </div>
      <CustomerPreviewDrawer id={activePreviewId} onClose={() => setPreview(null)} />
    </>
  );
}
