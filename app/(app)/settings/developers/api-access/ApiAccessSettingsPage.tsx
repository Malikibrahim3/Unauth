import { redirect } from "next/navigation";
import Link from 'next/link';
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import ApiIntegrationsClient from "@/components/settings/ApiIntegrationsClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
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

  return (
    <SettingsPageShell
      title="API access"
      subtitle="Scoped machine access for exports and integrations, with the reveal-once and revoke-now lifecycle stated in place."
      surfaceId="developer-api-access"
      layout="wide"
      truth={{
        access: "Manage settings permission and an eligible machine-access plan",
        currentState: machineAccessEnabled ? "Machine access enabled · key secrets remain reveal-once" : "Machine access unavailable for this workspace plan",
        saveBehavior: "Keys are created once; revocation is immediate after confirmation",
        impact: "Scopes allow approved reads and imports only; no merchant decision, publication, write-off, or deletion authority",
      }}
      secondaryActions={[<Link key="api-docs" className="ua-button ua-button--secondary ua-button--sm" href="/help/api-access">Read the API docs</Link>]}
    >
      <ApiIntegrationsClient machineAccessEnabled={machineAccessEnabled} />
    </SettingsPageShell>
  );
}
