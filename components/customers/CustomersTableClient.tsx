"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, PanelCard } from "@/components/ui";
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
  /** All-time payout case count for this customer. */
  payout_cases_total: number;
  /** Payout cases currently open (pending / open / escalated). */
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

  const setPreview = (profileId: string | null) => {
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
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              {p.names?.[0] ?? "-"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {p.primary_email ?? "-"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <span className="num" style={{ fontFamily: "var(--font-mono)" }}>
          {p.total_orders}
        </span>
      ),
    },
    {
      key: "spent",
      header: "Total spent",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <span className="num" style={{ fontFamily: "var(--font-mono)" }}>
          {p.has_mixed_currency
            ? "Mixed currencies"
            : p.total_spent_currency && p.total_spent > 0
              ? formatCurrency(p.total_spent, p.total_spent_currency)
              : "—"}
        </span>
      ),
    },
    {
      key: "cases",
      header: "Payout cases",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <span className="inline-flex items-center gap-1.5">
          <OpenCasesBadge count={p.payout_cases_open} />
          <span
            className="num"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
            }}
          >
            {p.payout_cases_total}
          </span>
        </span>
      ),
    },
    {
      key: "lastOrder",
      header: "Last order",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {p.last_order_at ? formatDate(p.last_order_at) : "—"}
        </span>
      ),
    },
    {
      key: "open",
      header: "",
      align: "right" as const,
      render: (p: CustomerRow) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: "var(--accent)" }}
          onClick={(e) => {
            e.stopPropagation();
            setPreview(p.id);
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
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-muted)",
          borderRadius: 4,
        }}
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setPreview(row.id)}
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
            onClick={() => setPreview(p.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {p.names?.[0] ?? "-"}
                </span>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.primary_email ?? "-"}
                </p>
              </div>
              <OpenCasesBadge count={p.payout_cases_open} />
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: "var(--text)" }}
                >
                  {p.total_orders}
                </span>{" "}
                orders
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: "var(--text)" }}
                >
                  {p.payout_cases_total}
                </span>{" "}
                payout cases
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>Last order {p.last_order_at ? formatDate(p.last_order_at) : "—"}</span>
            </div>
            <div
              className="mt-3 flex justify-end text-xs font-semibold"
              style={{ color: "var(--text)" }}
            >
              <span className="inline-flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </PanelCard>
        ))}
      </div>
      <CustomerPreviewDrawer id={previewId} onClose={() => setPreview(null)} />
    </>
  );
}
