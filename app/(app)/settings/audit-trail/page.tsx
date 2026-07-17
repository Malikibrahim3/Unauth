import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import AuditTrailClient from "@/components/settings/AuditTrailClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export default async function AuditTrailPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_AUDIT_TRAIL,
  );
  if (denied) redirect("/settings");

  const [{ data: teamRows }, { data: merchantRow }] = await Promise.all([
    serviceClient
      .from(TABLES.MERCHANT_MEMBERS)
      .select("user_id, invited_email, role, invite_status")
      .eq("merchant_id", ctx.merchantId)
      .eq("invite_status", "active"),
    serviceClient
      .from("merchants")
      .select("user_id")
      .eq("id", ctx.merchantId)
      .maybeSingle(),
  ]);

  const actorsByUserId: Record<string, { email: string; role: string }> = {};
  for (const row of (teamRows ?? []) as Array<{
    user_id: string | null;
    invited_email: string;
    role: string;
  }>) {
    if (!row.user_id) continue;
    const isOwner = merchantRow?.user_id === row.user_id;
    actorsByUserId[row.user_id] = {
      email: row.invited_email,
      role: isOwner ? "owner" : row.role,
    };
  }

  if (merchantRow?.user_id && !actorsByUserId[merchantRow.user_id]) {
    actorsByUserId[merchantRow.user_id] = {
      email: user.email ?? "Account owner",
      role: "owner",
    };
  }

  return (
    <SettingsPageShell
      eyebrow="Append-only · merchant scoped"
      title="Audit trail"
      subtitle="Review merchant-scoped user actions and claim lifecycle events with actor attribution."
      breadcrumbs={[{ label: "Settings", href: "/settings/account" }, { label: "Audit trail" }]}
    >
      <AuditTrailClient actorsByUserId={actorsByUserId} />
    </SettingsPageShell>
  );
}
