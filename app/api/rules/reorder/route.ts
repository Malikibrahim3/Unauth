import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { reorderSchema } from "@/lib/rules/store";

export async function PATCH(request: NextRequest) {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reorder payload" },
      { status: 400 },
    );
  }

  const { data, error } = await (serviceClient as any).rpc(
    "reorder_merchant_rules",
    {
      p_merchant_id: ctx.merchantId,
      p_actor_id: user.id,
      p_order: parsed.data.order,
    },
  );
  if (error) {
    return NextResponse.json(
      { error: "Failed to reorder rules; no priorities were changed" },
      { status: error.message.includes("scope") ? 404 : 409 },
    );
  }

  return NextResponse.json({ success: true, result: data });
}
