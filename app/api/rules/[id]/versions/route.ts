import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { updateRuleSchema, mapRuleRow, RULE_COLUMNS } from "@/lib/rules/store";
import { validateConditions } from "@/lib/rules/fields";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied) return denied;
  const { id } = await params;
  const { data } = await svc
    .from(TABLES.MERCHANT_RULE_VERSIONS)
    .select("*")
    .eq("merchant_id", ctx.merchantId)
    .eq("merchant_rule_id", id)
    .order("version", { ascending: false });
  return NextResponse.json({ versions: data ?? [] });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return denied;
  const { id } = await params;
  const parsed = updateRuleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid draft", details: parsed.error.flatten() },
      { status: 400 },
    );
  if (
    parsed.data.conditions &&
    validateConditions(parsed.data.conditions as never).length
  )
    return NextResponse.json({ error: "Invalid conditions" }, { status: 422 });
  const current = (
    await svc
      .from(TABLES.MERCHANT_RULES)
      .select(RULE_COLUMNS)
      .eq("merchant_id", ctx.merchantId)
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle()
  ).data;
  if (!current)
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  const base = mapRuleRow(current as never);
  const latest = (
    await svc
      .from(TABLES.MERCHANT_RULE_VERSIONS)
      .select("version")
      .eq("merchant_id", ctx.merchantId)
      .eq("merchant_rule_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
  ).data;
  const payload = { ...base, ...parsed.data };
  const { data, error } = await svc
    .from(TABLES.MERCHANT_RULE_VERSIONS)
    .insert({
      merchant_id: ctx.merchantId,
      merchant_rule_id: id,
      version: Number(latest?.version ?? 0) + 1,
      status: "draft",
      name: payload.name,
      description: payload.description,
      conditions: payload.conditions,
      action: payload.action,
      condition_operator: payload.condition_operator,
      priority: payload.priority,
      created_by: user.id,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A draft already exists"
            : "Failed to create draft",
      },
      { status: error.code === "23505" ? 409 : 500 },
    );
  return NextResponse.json({ version: data }, { status: 201 });
}
