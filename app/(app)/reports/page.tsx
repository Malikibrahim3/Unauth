import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { IntelligenceReportView } from "@/components/reporting/IntelligenceReportView";
import {
  loadIntelligenceReport,
  parseReportRange,
  REPORT_RANGES,
} from "@/lib/reporting/intelligence";
import ExportMenu from "@/components/reports/ExportMenu";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { SegmentedControl } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; timezone?: string }>;
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
  const range = parseReportRange(sp.range);
  const timezone = sp.timezone && sp.timezone.length < 80 ? sp.timezone : "UTC";
  const report = await loadIntelligenceReport(
    svc,
    ctx.merchantId,
    range,
    timezone,
  );
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reports</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Reconciled payout, loss, and recovery performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Report period"
            value={range}
            items={REPORT_RANGES.map((r) => ({ value: r, label: r === "all" ? "All time" : r, href: `/reports?range=${r}&timezone=${encodeURIComponent(timezone)}` }))}
          />
          <ExportMenu range={range} />
        </div>
      </header>
      <IntelligenceReportView report={report} />
    </div>
  );
}
