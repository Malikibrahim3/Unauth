import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import ApiIntegrationsClient from "@/components/settings/ApiIntegrationsClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export const dynamic = "force-dynamic";

export default async function ApiIntegrationsPage() {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { denied } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) redirect("/settings/account");

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
