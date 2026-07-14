import Link from "next/link";
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

export const dynamic = "force-dynamic";
export default async function DashboardPage({
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
    PERMISSIONS.VIEW_DASHBOARD,
  );
  if (denied)
    redirect(
      await resolveDefaultAppPath(svc, user.id, { exclude: ["/dashboard"] }),
    );
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
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Overview</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            What you&apos;re owed, what you&apos;ve recovered, and what needs a
            decision.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/work"
            className="min-h-9 rounded-[var(--radius-md)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-fg-on-500)]"
          >
            Open work
          </Link>
          <Link
            href="/claims?sort=value"
            className="min-h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold"
          >
            Review high-value cases
          </Link>
        </div>
      </header>
      <nav aria-label="Overview period" className="flex w-fit flex-wrap gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
        {REPORT_RANGES.map((r) => (
          <Link
            key={r}
            aria-current={r === range ? "page" : undefined}
            href={`/dashboard?range=${r}&timezone=${encodeURIComponent(timezone)}`}
            className={`min-h-8 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium ${r === range ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {r === "all" ? "All time" : r}
          </Link>
        ))}
        <Link
          href={`/reports?range=${range}&timezone=${encodeURIComponent(timezone)}`}
          className="min-h-8 px-3 py-1.5 text-sm font-medium text-[var(--accent)]"
        >
          Open reports
        </Link>
      </nav>
      <IntelligenceReportView report={report} compact />
    </div>
  );
}
