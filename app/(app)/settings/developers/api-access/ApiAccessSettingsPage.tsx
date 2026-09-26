import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import ApiIntegrationsAdvancedSection from "@/components/settings/ApiIntegrationsAdvancedSection";
import { merchantHasMachineApiAccess } from "@/lib/api/accessPolicy";

export const dynamic = "force-dynamic";

export default async function ApiIntegrationsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const ctx = await requirePagePermission(PERMISSIONS.MANAGE_SETTINGS);
  if (!ctx) redirect("/settings/workspace/account");
  const machineAccessEnabled = await merchantHasMachineApiAccess(
    getRequestServiceClient(),
    ctx.merchantId,
  );

  return <ApiIntegrationsAdvancedSection machineAccessEnabled={machineAccessEnabled} />;
}
