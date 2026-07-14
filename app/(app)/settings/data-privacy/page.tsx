import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { SectionCard } from "@/components/ui";
import BulkDeleteClient from "@/components/settings/BulkDeleteClient";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";

export default async function DataPrivacySettingsPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_AUDIT_TRAIL,
  );
  if (denied) redirect("/settings");

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="t-heading" style={{ color: "var(--text-primary)" }}>
        Data &amp; privacy
      </h1>
      <p
        className="text-body-sm mt-1"
        style={{ color: "var(--text-secondary)" }}
      >
        How Unauth handles merchant and customer data, retention, and
        compliance.
      </p>

      <div className="mt-6 space-y-4">
        <SectionCard title="How payout-case data is scoped">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PrivacyBadge value="Merchant-owned context" />
            <span
              className="inline-flex items-center rounded-sm border px-2 py-0.5 text-mono-sm"
              style={{
                background: "var(--privacy-fill)",
                borderColor: "var(--privacy-border)",
                color: "var(--privacy-ink)",
              }}
            >
              tenant scoped
            </span>
          </div>
          <div
            className="rounded-md border p-4 text-mono-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-muted)",
              color: "var(--data-id)",
            }}
          >
            source record -&gt; normalise -&gt; tenant scope -&gt; support
            payout case context
          </div>
          <p
            className="mt-3 text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Customer identifiers are used to link merchant-owned orders, support
            tickets, evidence, decisions, and outcomes to the correct payout
            case. Access remains scoped to your merchant workspace.
          </p>
        </SectionCard>

        <SectionCard title="Data scope">
          <p
            className="text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Unauth processes connected store, helpdesk, evidence, decision, and
            recovery data to support payout-case review for your store. Customer
            history is supporting context for support decisions, not a reusable
            denial list.
          </p>
        </SectionCard>

        <SectionCard title="Retention, removal & deletion">
          <p
            className="text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Audit runs and associated transaction data are retained according to
            your plan settings. Workspace removal controls hide eligible
            operational context while preserving required audit evidence. Full
            account deletion permanently removes merchant data. Contact support
            if you need help before closing your account.
          </p>
          <div className="mt-4">
            <BulkDeleteClient />
          </div>
        </SectionCard>

        <SectionCard title="Audit logging">
          <p
            className="text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            User actions, claim decisions, evidence attachments, and exports are
            recorded in an append-only audit trail for compliance review.
          </p>
          <Link
            href="/settings/audit-trail"
            className="mt-3 inline-block text-sm font-semibold hover:underline"
            style={{ color: "var(--accent)" }}
          >
            View audit trail
          </Link>
        </SectionCard>

        <SectionCard title="Legal documents">
          <ul
            className="space-y-2 text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>
              <Link
                href="/legal/privacy"
                className="font-semibold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                href="/legal/data-handling"
                className="font-semibold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Data handling statement
              </Link>
            </li>
            <li>
              <Link
                href="/legal/dpa"
                className="font-semibold hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Data processing agreement (DPA)
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
