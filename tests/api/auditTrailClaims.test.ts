import { NextRequest } from "next/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/supabase/scoped", () => ({
  createScopedClient: jest.fn((_merchantId: string, service: any) => service),
}));

jest.mock("@/lib/permissions", () => ({
  PERMISSIONS: { VIEW_AUDIT_TRAIL: "view_audit_trail" },
  requirePermission: jest.fn(),
}));

jest.mock("@/lib/permissions/audit", () => ({
  logAction: jest.fn(),
}));

jest.mock("@/lib/log", () => ({
  createRequestLogger: jest.fn(() => ({ error: jest.fn() })),
  withRequestLogging: jest.fn((_route: string, handler: any) => handler),
}));

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createScopedClient } from "@/lib/supabase/scoped";
import { requirePermission } from "@/lib/permissions";
import { GET } from "@/app/api/audit-trail/route";

function setupAuditService() {
  const service = {
    from: (table: string) => {
      const chain: any = {
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        range: () => chain,
        limit: () => chain,
        select: () => chain,
        then: async (resolve: any) => {
          if (table === "claim_events") {
            return resolve({
              data: [
                {
                  id: "ev-1",
                  claim_id: "claim-1",
                  merchant_id: "m-1",
                  event_type: "claim_reopened",
                  from_status: "resolved",
                  to_status: "under_review",
                  actor_user_id: "user-1",
                  metadata: {},
                  created_at: "2026-05-27T10:00:00.000Z",
                },
              ],
              error: null,
            });
          }
          if (table === "support_payout_cases") {
            return resolve({
              data: [
                {
                  id: "claim-1",
                },
              ],
              error: null,
            });
          }
          return resolve({ data: [], count: 0, error: null });
        },
      };
      return { select: () => chain };
    },
  };
  (createServiceClient as jest.Mock).mockReturnValue(service);
}

describe("audit trail claim events", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });
    (createScopedClient as jest.Mock).mockImplementation(
      (_merchantId: string, service: any) => service,
    );
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { merchantId: "m-1", userId: "user-1", role: "owner" },
    });
    setupAuditService();
  });

  it("returns merchant-scoped claim events in audit trail response", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/audit-trail?resourceType=claim"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "claim_reopened",
          resource_type: "claim",
          resource_id: "claim-1",
          resource_href: "/cases/claim-1",
          actor_user_id: "user-1",
          metadata: expect.objectContaining({
            previous_status: "resolved",
            new_status: "under_review",
          }),
        }),
      ]),
    );
  });
});
