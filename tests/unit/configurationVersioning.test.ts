import fs from "fs";
import path from "path";
import {
  findRuleConflicts,
  requiredFields,
  simulateRule,
} from "@/lib/rules/versioning";
import { FORBIDDEN_MVP_CAPABILITIES } from "@/lib/connectors/capabilities";
import { listConnectors } from "@/lib/connectors/registry";

const base: any = {
  id: "a",
  merchant_id: "m",
  name: "High value",
  description: null,
  is_active: true,
  priority: 1,
  condition_operator: "and",
  conditions: [
    { id: "c", field: "order_value_usd", operator: "gte", value: 100 },
  ],
  action: "manual_review",
};

describe("safe configuration contracts", () => {
  it("simulation is read-only and reports required inputs", () => {
    expect(requiredFields(base.conditions)).toEqual(["order_value_usd"]);
    const result = simulateRule(base, {
      merchant_claim_count: 0,
      days_since_last_claim: null,
      claim_types: [],
      order_value_usd: 200,
      account_age_days: null,
    });
    expect(result.writesPerformed).toBe(0);
    expect(result.matched).toBe(true);
  });

  it("reports same-priority contradictory policies before publish", () => {
    const conflicts = findRuleConflicts(base, [
      { ...base, id: "b", name: "Contradiction", action: "approve" },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toMatch(/different recommended action/);
  });

  it("connector manifest structurally forbids payout actions", () => {
    for (const adapter of listConnectors()) {
      for (const capability of adapter.manifest.capabilities) {
        if (FORBIDDEN_MVP_CAPABILITIES.has(capability.id)) {
          expect(capability.support).toBe("unsupported");
          expect(capability.enabledByDefault).toBe(false);
        }
      }
    }
  });

  it("retains discarded drafts and atomically archives and reorders rules", () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260713119000_configuration_archive_history.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("status = 'discarded'");
    expect(sql).toContain("archive_merchant_rule");
    expect(sql).toContain("reorder_merchant_rules");
    expect(sql).toContain("for update");
    expect(sql).not.toContain("delete from public.merchant_rule_versions");
  });
});
