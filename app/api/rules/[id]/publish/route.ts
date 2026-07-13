import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { findRuleConflicts, requiredFields } from "@/lib/rules/versioning";
import { mapRuleRow, RULE_COLUMNS } from "@/lib/rules/store";

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
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const draft = (
    await service
      .from(TABLES.MERCHANT_RULE_VERSIONS)
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .eq("merchant_rule_id", id)
      .eq("status", "draft")
      .maybeSingle()
  ).data;
  if (!draft)
    return NextResponse.json({ error: "No draft to publish" }, { status: 409 });
  const active =
    (
      await service
        .from(TABLES.MERCHANT_RULES)
        .select(RULE_COLUMNS)
        .eq("merchant_id", ctx.merchantId)
        .eq("is_active", true)
        .is("archived_at", null)
    ).data ?? [];
  const candidate = mapRuleRow({
    id,
    merchant_id: ctx.merchantId,
    ...draft,
    is_active: true,
  } as never);
  const conflicts = findRuleConflicts(
    candidate,
    active.map((rule: unknown) => mapRuleRow(rule as never)),
  );
  const dataRequirements = requiredFields(candidate.conditions);

  if (!body.confirm)
    return NextResponse.json({
      confirmationRequired: true,
      version: draft.version,
      dataRequirements,
      conflicts,
    });
  if (conflicts.length && !body.acceptConflicts)
    return NextResponse.json(
      { error: "Conflicts require explicit acceptance", conflicts },
      { status: 409 },
    );

  const { data, error } = await (service as any).rpc(
    "publish_merchant_rule_version",
    {
      p_merchant_id: ctx.merchantId,
      p_rule_id: id,
      p_actor_id: user.id,
    },
  );
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0002"
            ? "Draft or rule no longer exists"
            : "Atomic publish failed; no configuration was changed",
      },
      { status: error.code === "P0002" ? 409 : 500 },
    );
  return NextResponse.json({ published: data, dataRequirements, conflicts });
}
