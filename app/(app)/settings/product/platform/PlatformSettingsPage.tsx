import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
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
  return <PlatformSettingsClient canManage={canManage} />;
}
