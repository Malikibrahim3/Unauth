import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { updateRuleSchema } from "@/lib/rules/store";
import { validateConditions } from "@/lib/rules/fields";

type Context = { params: Promise<{ id: string; versionId: string }> };

async function authorize() {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user)
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied || !ctx)
    return {
      response:
        denied ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { service, ctx, user };
}

export async function PATCH(request: Request, context: Context) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const { id, versionId } = await context.params;
  const parsed = updateRuleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid draft" },
      { status: 400 },
    );
  }
  if (parsed.data.conditions) {
    const errors = validateConditions(parsed.data.conditions as never);
    if (errors.length > 0)
      return NextResponse.json({ error: errors[0]!.message }, { status: 422 });
  }
  const update: Record<string, unknown> = {};
  for (const key of [
    "name",
    "description",
    "conditions",
    "action",
    "condition_operator",
    "priority",
  ] as const) {
    if (parsed.data[key] !== undefined) update[key] = parsed.data[key];
  }
  const { data, error } = await access.service
    .from(TABLES.MERCHANT_RULE_VERSIONS)
    .update(update)
    .eq("id", versionId)
    .eq("merchant_rule_id", id)
    .eq("merchant_id", access.ctx.merchantId)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Draft update failed; no published rule changed" },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: "Editable draft not found" },
      { status: 404 },
    );
  return NextResponse.json({ version: data });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const { id, versionId } = await context.params;
  const { data, error } = await (access.service as any).rpc(
    "discard_merchant_rule_draft",
    {
      p_merchant_id: access.ctx.merchantId,
      p_actor_id: access.user.id,
      p_rule_id: id,
      p_version_id: versionId,
    },
  );
  if (error) {
    const missing = error.message.includes("editable_draft_not_found");
    return NextResponse.json(
      {
        error: missing
          ? "Editable draft not found"
          : "Draft could not be discarded",
      },
      { status: missing ? 404 : 500 },
    );
  }
  return NextResponse.json({ success: true, result: data });
}
