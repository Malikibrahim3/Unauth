import fs from "fs";
import path from "path";
import {
  buildClaimTypeBreakdown,
  buildRecoveryMetrics,
  buildRequestedActionBreakdown,
  payoutExposureForClaim,
} from "@/app/(app)/reports/reportsPageUtils";
import type { RecoveryCase } from "@/lib/recoveries/types";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("payout-control reports contract", () => {
  it("uses payout and recovery labels instead of store/network intelligence copy", () => {
    const page = read("app/(app)/reports/page.tsx");
    const view = read("components/reporting/IntelligenceReportView.tsx");
    const model = read("lib/reporting/intelligence.ts");

    const combined = `${page}\n${view}\n${model}`;
    expect(combined).toContain("Reports");
    expect(combined).toContain("Value this period");
    expect(combined).toContain("Payout exposure");
    expect(combined).toContain("Prevented");
    expect(combined).toContain("Realised loss");
    expect(combined).toContain("Recovery performance");
    expect(combined).toContain("Source coverage");
    expect(combined).toContain("Report definitions");
    expect(combined).not.toContain("Store and network intelligence");
    expect(combined).not.toContain("Live intelligence");
    expect(combined).not.toContain("Identity signal match rate");
  });

  it("keeps exact drillable tables alongside the dashboard charts", () => {
    const view = read("components/reporting/IntelligenceReportView.tsx");
    const charts = read("components/reporting/DashboardCharts.tsx");

    expect(view).toContain("<table");
    expect(view).toContain("underlying");
    expect(view).toContain('b.caseIds.length === 1 ? "case" : "cases"');
    expect(charts).toContain("recharts");
    expect(charts).toContain("Exposure and recovered");
    expect(charts).toContain("Loss causes");
    expect(charts).toContain("Recovery progression");
    expect(charts).toContain("View chart data");
    expect(charts).not.toContain("monotone");
    expect(charts).not.toContain("Recovery funnel");
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
