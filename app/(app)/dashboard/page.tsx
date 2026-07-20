import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import {
  loadDashboardPeriodComparison,
  loadIntelligenceReport,
  parseReportRange,
} from "@/lib/reporting/intelligence";

export const dynamic = "force-dynamic";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    timezone?: string;
    compare?: string;
    currency?: string;
  }>;
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
    PERMISSIONS.VIEW_DASHBOARD,
  );
  if (denied)
    redirect(
      await resolveDefaultAppPath(svc, user.id, { exclude: ["/dashboard"] }),
    );
  const sp = await searchParams;
  const range = parseReportRange(sp.range);
  const timezone = sp.timezone && sp.timezone.length < 80 ? sp.timezone : "UTC";
  const compare = range !== "all" && sp.compare === "previous" ? "previous" : "none";
  const asOf = new Date();
  const [report, comparison] = await Promise.all([
    loadIntelligenceReport(svc, ctx.merchantId, range, timezone, { asOf }),
    compare === "previous"
      ? loadDashboardPeriodComparison(svc, ctx.merchantId, range, asOf)
      : Promise.resolve(null),
  ]);
  const requestedCurrency = sp.currency?.toUpperCase();
  const selectedCurrency = report.bridges.some(
    (bridge) => bridge.currency === requestedCurrency,
  )
    ? requestedCurrency ?? null
    : report.bridges[0]?.currency ?? null;

  return (
    <DashboardOverview
      report={report}
      comparison={comparison}
      selectedCurrency={selectedCurrency}
      compare={compare}
    />
  );
}
