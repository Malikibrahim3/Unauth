import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { parseReportRange, reportCutoff } from "@/lib/reporting/intelligence";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { DataTableServer, EmptyState, StatusBadge } from "@/components/ui";
export const dynamic = "force-dynamic";

function humanizeRecordValue(value: unknown): string {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function recordLabel(id: string): string {
  return `Record ${id.slice(0, 8)}`;
}

export default async function ReportRecords({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_AUDIT,
  );
  if (denied) redirect(await resolveDefaultAppPath(svc, user.id));
  if (!(await merchantHasEntitlement(svc, ctx.merchantId, "REPORTS_ADVANCED")))
    redirect("/settings/billing?required=REPORTS_ADVANCED");
  const sp = await searchParams;
  const kind = sp.kind === "recovery" ? "recovery" : "case";
  const dimension = sp.dimension === "reason" ? "reason" : "status";
  const value = (sp.value || "").slice(0, 100);
  const range = parseReportRange(sp.range);
  const cutoff = reportCutoff(range);
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * 50;
  let query =
    kind === "recovery"
      ? svc
          .from(TABLES.RECOVERY_CASES)
          .select(
            "id,status,recovery_type,currency,amount_recovered,updated_at",
            { count: "exact" },
          )
          .eq("merchant_id", ctx.merchantId)
      : svc
          .from(TABLES.MERCHANT_CLAIMS)
          .select(
            "id,status,claim_type,reason_normalized,currency,amount_at_risk,submitted_at,updated_at",
            { count: "exact" },
          )
          .eq("merchant_id", ctx.merchantId);
  if (value)
    query =
      kind === "recovery" || dimension === "status"
        ? query.eq("status", value)
        : query.or(`reason_normalized.eq.${value},claim_type.eq.${value}`);
  if (cutoff)
    query = query.gte(
      kind === "recovery" ? "updated_at" : "submitted_at",
      cutoff,
    );
  if (sp.currency) query = query.eq("currency", sp.currency.toUpperCase());
  const result = await query
    .order("updated_at", { ascending: false })
    .range(from, from + 49);
  const rows = (result.data ?? []) as Array<Record<string, any>>;
  const total = result.count ?? 0;
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <Link
        className="text-sm font-medium text-[var(--accent)]"
        href={`/reports?range=${range}`}
      >
        Return to reports
      </Link>
      <header>
        <h1 className="text-2xl font-semibold capitalize">
          {humanizeRecordValue(value || kind)} records
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {formatNumber(total)} exact matching records ·{" "}
          {range === "all" ? "all time" : range}{" "}
          {sp.currency ? `· ${sp.currency.toUpperCase()}` : ""}
        </p>
      </header>
      <DataTableServer
        rows={rows}
        getRowKey={(row) => String(row.id)}
        density="compact"
        emptyState={
          <EmptyState
            variant="compact"
            title="No matching records"
            description="Try a broader report range or remove the active filter."
          />
        }
        columns={[
          {
            key: "record",
            header: "Record",
            render: (row) => (
              <Link
                className="font-mono text-[var(--text-link)] hover:underline"
                href={kind === "recovery" ? `/recoveries/${row.id}` : `/claims/${row.id}`}
              >
                {recordLabel(String(row.id))}
              </Link>
            ),
          },
          {
            key: "type",
            header: "Type",
            render: (row) => humanizeRecordValue(row.recovery_type || row.reason_normalized || row.claim_type),
          },
          {
            key: "status",
            header: "State",
            render: (row) => <StatusBadge family="workflowStatus" value={String(row.status ?? "unknown")} size="sm" />,
          },
          {
            key: "amount",
            header: "Amount",
            align: "right" as const,
            render: (row) => {
              const amount = row.amount_recovered ?? row.amount_at_risk;
              return row.currency && amount != null
                ? <span className="tabular-nums">{Number(amount).toFixed(2)} {row.currency}</span>
                : "—";
            },
          },
          {
            key: "updated",
            header: "Updated",
            align: "right" as const,
            render: (row) => formatDateTime(String(row.updated_at)),
          },
        ]}
      />
      <nav className="flex justify-between">
        {page > 1 ? (
          <Link
            href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {from + rows.length < total ? (
          <Link
            href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}
          >
            Next
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
