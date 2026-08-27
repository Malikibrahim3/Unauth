import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { TABLES } from "@/lib/supabase/tables";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import AuditTrailClient from "@/components/settings/AuditTrailClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export default async function AuditTrailPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_AUDIT_TRAIL,
  );
  if (denied) redirect("/settings");

  const { data: teamRows } = await serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select("user_id, invited_email, role, invite_status")
    .eq("merchant_id", ctx.merchantId)
    .eq("invite_status", "active");

  const actorsByUserId: Record<string, { email: string; role: string }> = {};
  for (const row of (teamRows ?? []) as Array<{
    user_id: string | null;
    invited_email: string;
    role: string;
  }>) {
    if (!row.user_id) continue;
    actorsByUserId[row.user_id] = {
      email: row.invited_email,
      role: row.role,
    };
  }

  return (
    <SettingsPageShell
      title="Audit trail"
      subtitle="Who did what, to which object, when, and with which permission — including everything automation did and did not do."
      surfaceId="audit-trail"
      layout="wide"
      truth={{
        access: "Members with View audit trail permission",
        currentState: "Immutable workspace events, newest first, with retained actor and object context where available",
        saveBehavior: "Read and export only; audit events cannot be edited from this page",
        impact: "Filters change the view and export scope, never the underlying history",
      }}
    >
      <AuditTrailClient actorsByUserId={actorsByUserId} />
    </SettingsPageShell>
  );
}
