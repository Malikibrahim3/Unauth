import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  PERMISSIONS: { SUBMIT_PAYOUT_DECISIONS: "submit_payout_decisions" },
  requirePermission: jest.fn(),
}));

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { PATCH } from "@/app/api/work-tasks/bulk/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MERCHANT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "33333333-3333-4333-8333-333333333333";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/work-tasks/bulk", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setup(
  options: { authed?: boolean; denied?: boolean; rpcError?: string } = {},
) {
  const { authed = true, denied = false, rpcError } = options;
  const rpc = jest
    .fn()
    .mockResolvedValue(
      rpcError
        ? { data: null, error: { message: rpcError } }
        : {
            data: [
              { id: TASK_ID, merchant_id: MERCHANT_ID, status: "completed" },
            ],
            error: null,
          },
    );
  (createClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: authed ? { id: USER_ID } : null } }),
    },
  });
  (createServiceClient as jest.Mock).mockReturnValue({ rpc });
  (requirePermission as jest.Mock).mockResolvedValue({
    denied: denied
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : null,
    ctx: denied ? null : { merchantId: MERCHANT_ID, userId: USER_ID },
  });
  return rpc;
}

describe("PATCH /api/work-tasks/bulk", () => {
  afterEach(() => jest.clearAllMocks());

  it("rejects unauthenticated requests before creating a service client", async () => {
    setup({ authed: false });
    const response = await PATCH(
      request({ ids: [TASK_ID], action: "complete" }),
    );
    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("requires payout-decision permission", async () => {
    setup({ denied: true });
    const response = await PATCH(
      request({ ids: [TASK_ID], action: "complete" }),
    );
    expect(response.status).toBe(403);
  });

  it.each([
    [{ ids: [], action: "complete" }, "empty task list"],
    [{ ids: ["not-a-uuid"], action: "complete" }, "invalid task identifier"],
    [{ ids: [TASK_ID], action: "delete" }, "unsupported action"],
    [{ ids: [TASK_ID], action: "snooze" }, "snooze without a time"],
  ])("rejects %s (%s)", async (body) => {
    const rpc = setup();
    const response = await PATCH(request(body));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes only the permission-scoped merchant and actor to the atomic function", async () => {
    const rpc = setup();
    const until = "2027-01-01T00:00:00.000Z";
    const response = await PATCH(
      request({ ids: [TASK_ID], action: "snooze", until }),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("bulk_transition_work_tasks", {
      p_merchant_id: MERCHANT_ID,
      p_user_id: USER_ID,
      p_task_ids: [TASK_ID],
      p_action: "snooze",
      p_until: until,
    });
  });

  it("does not disclose a cross-merchant task through the bulk endpoint", async () => {
    setup({ rpcError: "work_task_scope_mismatch" });
    const response = await PATCH(
      request({ ids: [TASK_ID], action: "complete" }),
    );
    expect(response.status).toBe(404);
  });
});
