import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
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
import { WorkbenchPage } from "@/components/workbench/WorkbenchPage";
import { filterChipContract } from "@/styles/authenticated/contracts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; timezone?: string }>;
}) {
  const user = await getRequestUser();
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
    <WorkbenchPage
      title="Reports"
      subtitle="Reconciled payout, loss, and recovery performance."
      actionBarLeft={
        <div className="flex min-w-max items-center gap-1.5" aria-label="Report scope">
          <span className="mr-1 text-[10px] font-medium text-[var(--text-tertiary)]">Date range</span>
          {REPORT_RANGES.map((r) => (
            <Link
              key={r}
              aria-current={r === range ? "page" : undefined}
              href={`/reports?range=${r}&timezone=${encodeURIComponent(timezone)}`}
              className={cn(
                filterChipContract.base,
                filterChipContract.hover,
                r === range ? filterChipContract.selected : filterChipContract.unselected,
              )}
            >
              {r === "all" ? "All time" : r}
            </Link>
          ))}
        </div>
      }
      actionBarRight={<ExportMenu range={range} timezone={timezone} />}
      main={
        <section className="p-3.5 md:p-4">
          <IntelligenceReportView report={report} />
        </section>
      }
    />
  );
}
