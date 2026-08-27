import fs from "fs";
import path from "path";
import {
  buildClaimTypeBreakdown,
  buildRecoveryMetrics,
  buildRequestedActionBreakdown,
  payoutExposureForClaim,
} from "@/app/(app)/financials/reports/reportsPageUtils";
import type { RecoveryCase } from "@/lib/recoveries/types";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("payout-control reports contract", () => {
  it("uses payout and recovery labels instead of store/network intelligence copy", () => {
    const page = read("app/(app)/financials/reports/ReportsPage.tsx");
    const view = read("components/reporting/IntelligenceReportView.tsx");
    const ladder = read("components/reports/FinancialStageLadder.tsx");
    const model = read("lib/reporting/intelligence.ts");
    const copy = read("lib/ui/merchantCopy.ts");

    const combined = `${page}\n${view}\n${ladder}\n${model}\n${copy}`;
    expect(combined).toContain("Reports");
    expect(combined).toContain("How did requested value become final net loss?");
    expect(combined).toContain("Maximum exposure");
    expect(combined).toContain("Prevented");
    expect(combined).toContain("Confirmed loss");
    expect(combined).toContain("Recovery performance");
    expect(combined).toContain("Source coverage");
    expect(combined).toContain("Metric definitions");
    expect(combined).not.toContain("Store and network intelligence");
    expect(combined).not.toContain("Live intelligence");
    expect(combined).not.toContain("Identity signal match rate");
  });

  it("keeps the Challenge 6 compact report figures drillable and accessible", () => {
    const view = read("components/reporting/IntelligenceReportView.tsx");
    const commandIndex = read("components/reporting/ReportCommandIndex.tsx");

    expect(view).toContain('<table className="sr-only">');
    expect(view).toContain("View chart data");
    expect(view).toContain("financialReportRecordsHref");
    expect(view).toContain("Is exposure outpacing recovery?");
    expect(view).toContain("Which causes make up confirmed loss?");
    expect(view).toContain("Which open operations need attention?");
    expect(view).toContain("Where is recovered value coming from?");
    expect(commandIndex).toContain("Open a report");
    expect(view).not.toContain("DashboardCharts");
    expect(view).not.toContain("How is financial value accumulating?");
    expect(view).not.toContain("Case financials");
  });

  it("uses one reconciliation notice and keeps the records table and export visibly scoped", () => {
    const ladder = read("components/reports/FinancialStageLadder.tsx");
    const records = read("app/(app)/financials/reports/records/page.tsx");

    expect(ladder).toContain("finalUnreconciled");
    expect(ladder).toContain("Cannot be computed — one or more stages fail the source-to-ledger reconciliation contract");
    expect(records).toContain("RegistrySurface");
    expect(records).toContain("DataTableServer");
    expect(records).toContain("ExportMenu");
    expect(records).toContain("Financial metric");
  });

  it("keeps every Reports breadcrumb on the canonical loss-ledger route", () => {
    const reportSurfaces = [
      read("app/(app)/financials/reports/ReportsPage.tsx"),
      read("app/(app)/financials/reports/records/page.tsx"),
      read("components/reports/NamedReportDetail.tsx"),
      read("components/reports/ReportsLoadingFrame.tsx"),
    ].join("\n");

    expect(reportSurfaces).toContain("/financials/losses");
    expect(reportSurfaces).not.toContain("/financials/loss-ledger");
  });

  it("rolls payout exposure and requested actions into report breakdowns", () => {
    const claims = [
      {
        id: "c1",
        status: "open",
        claim_type: "item_not_received",
        amount_at_risk: 100,
        total_estimated_loss: null,
        requested_action: "refund",
      },
      {
        id: "c2",
        status: "open",
        claim_type: "wrong_item",
        amount_at_risk: null,
        total_estimated_loss: null,
        replacement_item_value: 80,
        replacement_shipping_cost: 12,
        requested_action: "replacement",
      },
    ];

    expect(payoutExposureForClaim(claims[1])).toBe(92);
    expect(buildClaimTypeBreakdown(claims)[0]).toMatchObject({
      label: "Item not received",
      value: 100,
    });
    expect(
      buildRequestedActionBreakdown(claims).map((row) => row.label),
    ).toEqual(["Refund", "Replacement"]);
  });

  it("calculates recovered, unrecovered, and open recovery value", () => {
    const base = {
      id: "r1",
      merchant_id: "m1",
      support_payout_case_id: "c1",
      partner_id: null,
      recovery_type: "carrier_claim",
      owner_type: "carrier",
      currency: "USD",
      deadline_at: null,
      next_chase_at: null,
      last_chased_at: null,
      evidence_required: [],
      evidence_missing: [],
      evidence_complete: true,
      rejection_reason: null,
      calculation_reason: [],
      excluded_costs: [],
      internal_owner_user_id: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    } satisfies Partial<RecoveryCase>;

    const metrics = buildRecoveryMetrics([
      {
        ...base,
        status: "paid",
        merchant_loss_amount: 100,
        eligible_loss_amount: 90,
        estimated_recoverable_min: 70,
        estimated_recoverable_max: 90,
        amount_recovered: 80,
      } as RecoveryCase,
      {
        ...base,
        id: "r2",
        status: "chase_due",
        merchant_loss_amount: 200,
        eligible_loss_amount: 150,
        estimated_recoverable_min: 100,
        estimated_recoverable_max: 150,
        amount_recovered: null,
      } as RecoveryCase,
    ]);

    expect(metrics.recoveredAmount).toBe(80);
    expect(metrics.unrecoveredAmount).toBe(220);
    expect(metrics.openRecoveryValue).toBe(150);
    expect(metrics.winRate).toBe(1);
  });
});
