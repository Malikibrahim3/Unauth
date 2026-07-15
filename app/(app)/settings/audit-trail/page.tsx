import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History, ShieldCheck } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import AuditTrailClient from "@/components/settings/AuditTrailClient";

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
    <div className="max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <History
            className="h-5 w-5"
            style={{ color: "var(--privacy-ink)" }}
          />
          <h1 className="t-heading" style={{ color: "var(--text)" }}>
            Audit trail
          </h1>
        </div>
        <p
          className="mt-2 max-w-2xl text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Review merchant-scoped user actions and claim lifecycle events with
          actor attribution.
        </p>
        <p
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: "var(--privacy-ink)" }}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Append-only · merchant scoped
        </p>
      </div>

      <AuditTrailClient actorsByUserId={actorsByUserId} />
    </div>
  );
}
