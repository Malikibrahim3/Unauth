import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { PlatformSettingsClient } from "@/components/settings/PlatformSettingsClient";
export default async function PlatformSettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const client = createServiceClient();
  const { denied, ctx } = await requirePermission(
    client,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied || !ctx) redirect("/overview");
  const canManage = await hasPermission(
    client,
    ctx,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  return (
    <SettingsPageShell
      title="Defaults"
      subtitle="Reporting, matching, financial, workflow, and connection policy defaults."
      surfaceId="platform-defaults"
      truth={{
        access: canManage ? "Owner or administrator with Manage settings" : "Read-only for your current role",
        currentState: "Loaded workspace defaults are the effective values for future work",
        saveBehavior: "One explicit save applies the grouped defaults together",
        impact: "Future matching, deadlines, alerts, estimates, and connector policy; never historical decisions or ledger entries",
      }}
    >
      <PlatformSettingsClient canManage={canManage} />
    </SettingsPageShell>
  );
}
