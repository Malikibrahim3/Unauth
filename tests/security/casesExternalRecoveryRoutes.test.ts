import { readFileSync } from "node:fs";

const routePaths = {
  caseFile: "app/api/claims/[claimId]/case-file/route.ts",
  packs: "app/api/recoveries/[id]/claim-packs/route.ts",
  packDownload: "app/api/recoveries/[id]/claim-packs/[packId]/route.ts",
  submissions: "app/api/recoveries/[id]/submissions/route.ts",
  responses: "app/api/recoveries/[id]/provider-responses/route.ts",
} as const;

function source(name: keyof typeof routePaths): string {
  return readFileSync(routePaths[name], "utf8");
}

describe("Cases external recovery route contract", () => {
  it("authenticates the case file and artifact download reads", () => {
    for (const name of ["caseFile", "packDownload"] as const) {
      const content = source(name);
      expect(content).toContain("authorizeInvestigationRequest");
      expect(content).toContain("PERMISSIONS.VIEW_INBOX");
      expect(content).toContain("merchantId");
    }
  });

  it("keeps every write behind submit permission and an idempotency key", () => {
    for (const name of ["packs", "submissions", "responses"] as const) {
      const content = source(name);
      expect(content).toContain("authorizeInvestigationRequest");
      expect(content).toContain("PERMISSIONS.SUBMIT_PAYOUT_DECISIONS");
      expect(content).toContain("idempotencyKeyFrom");
      expect(content).toContain("Idempotency-Key");
    }
  });

  it("keeps provider actions manual and never calls a live connector", () => {
    const combined = ["packs", "submissions", "responses"].map(source).join("\n");
    expect(combined).toContain("manual");
    expect(combined).not.toMatch(/fetch\([^)]*provider|carrier|courier/i);
    expect(combined).not.toContain("sendEmail");
    expect(combined).not.toContain("connector_action_runs");
  });

  it("scopes pack artifacts, submissions, and responses to the authenticated merchant", () => {
    expect(source("packs")).toContain("auth.ctx.merchantId");
    expect(source("packDownload")).toContain("merchant_id");
    expect(source("submissions")).toContain("auth.ctx.merchantId");
    expect(source("responses")).toContain("auth.ctx.merchantId");
  });
});
