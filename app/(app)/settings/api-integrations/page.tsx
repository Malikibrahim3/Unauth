import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import ApiIntegrationsClient from "@/components/settings/ApiIntegrationsClient";

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
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm text-[var(--text-secondary)]">Developer access</p>
        <h1 className="mt-1 text-2xl font-semibold">API access</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          Create and revoke merchant-scoped credentials for approved custom
          integrations. Secrets are shown once and every change is written to
          the audit trail.
        </p>
      </header>
      <ApiIntegrationsClient />
    </main>
  );
}
