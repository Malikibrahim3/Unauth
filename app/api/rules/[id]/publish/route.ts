import { verifyImpactProof, readImpactRevision } from '@/lib/rules/impactToken';
import { impactHash } from '@/lib/rules/impactRead';
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
  const activeResult =
    (
      await service
        .from(TABLES.MERCHANT_RULES)
        .select(RULE_COLUMNS)
        .eq("merchant_id", ctx.merchantId)
        .eq("is_active", true)
        .is("archived_at", null)
    );
  if (activeResult.error) return NextResponse.json({ error: "Published policy unavailable." }, { status: 503 });
  const active = activeResult.data ?? [];
  const candidate = mapRuleRow({
    ...draft,
    id,
    merchant_id: ctx.merchantId,
    is_active: true,
  } as never);
  const conflicts = findRuleConflicts(
    candidate,
    active.map((rule: unknown) => mapRuleRow(rule as never)),
  );
  const dataRequirements = requiredFields(candidate.conditions);

  const proof = verifyImpactProof(body.impactToken, ctx.merchantId, id);
  if (!proof) return NextResponse.json({ error: 'Save your draft and run Preview impact before publication. The preview may have expired.' }, { status: 409 });
  let revision: string;
  try { revision = await readImpactRevision(service, ctx.merchantId); }
  catch { return NextResponse.json({ error: 'Publication version tracking is unavailable.' }, { status: 503 }); }
  const currentRules = (active as unknown[]).map((rule: unknown) => mapRuleRow(rule as never)).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const proposed = [...currentRules.filter(rule => rule.id !== id), candidate];
  if (proof.revision !== revision || proof.proposedHash !== impactHash(proposed)) {
    return NextResponse.json({ error: 'Draft, policy or source evidence changed. Run Preview impact again.' }, { status: 409 });
  }
  let noCases = false;
  if (proof.evaluatedCount === 0) {
    const { count, error } = await service.from(TABLES.MERCHANT_CLAIMS).select('id', { count: 'exact', head: true }).eq('merchant_id', ctx.merchantId);
    if (error || count == null) return NextResponse.json({ error: 'Case population is unavailable.' }, { status: 503 });
    if (count > 0) return NextResponse.json({ error: 'No cases in this preview window. Choose a window containing cases before publishing.' }, { status: 409 });
    noCases = true;
  }
  if (body.confirm === true && noCases && body.acknowledgeNoCases !== true) return NextResponse.json({ error: 'Acknowledge that no case-based preview is available.' }, { status: 409 });

  if (body.confirm !== true)
    return NextResponse.json({
      confirmationRequired: true,
      noCases,
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
    "publish_previewed_merchant_rule",
    {
      p_merchant_id: ctx.merchantId,
      p_rule_id: id,
      p_actor_id: user.id,
      p_revision: proof.revision,
      p_draft_id: draft.id,
      p_no_cases_ack: body.acknowledgeNoCases === true,
    },
  );
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0002"
            ? "Draft or rule no longer exists"
            : "Publication could not complete. Refresh versions and run Preview impact again.",
      },
      { status: ["P0002", "40001", "40P01"].includes(error.code) ? 409 : error.code === "42501" ? 403 : 500 },
    );
  return NextResponse.json({ published: data, dataRequirements, conflicts });
}
