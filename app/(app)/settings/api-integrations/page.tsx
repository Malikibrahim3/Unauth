import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import ApiIntegrationsClient from "@/components/settings/ApiIntegrationsClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export const dynamic = "force-dynamic";

export default async function ApiIntegrationsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const ctx = await requirePagePermission(PERMISSIONS.MANAGE_SETTINGS);
  if (!ctx) redirect("/settings/account");

  return (
    <SettingsPageShell
      eyebrow="Developer access"
      title="API access"
      subtitle="Create and revoke merchant-scoped credentials for approved custom integrations. Secrets are shown once and every change is written to the audit trail."
      breadcrumbs={[{ label: "Settings", href: "/settings/account" }, { label: "API access" }]}
    >
      <ApiIntegrationsClient />
    </SettingsPageShell>
  );
}
