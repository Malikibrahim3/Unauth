import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";

const schema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(["assign_to_me", "start", "complete", "snooze"]),
    until: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "snooze" && !value.until)
      context.addIssue({
        code: "custom",
        path: ["until"],
        message: "Snooze time is required",
      });
  });

export async function PATCH(request: NextRequest) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid bulk task action", details: parsed.error.flatten() },
      { status: 400 },
    );
  const { data, error } = await service.rpc("bulk_transition_work_tasks", {
    p_merchant_id: ctx.merchantId,
    p_user_id: user.id,
    p_task_ids: parsed.data.ids,
    p_action: parsed.data.action,
    p_until: parsed.data.until ?? null,
  });
  if (error)
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("scope") ? 404 : 409 },
    );
  return NextResponse.json({ tasks: data ?? [], count: data?.length ?? 0 });
}
