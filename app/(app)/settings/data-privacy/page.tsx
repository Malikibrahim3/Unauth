import Link from "next/link";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";
import { getRequestUser, requirePagePermission } from "@/lib/auth/requestContext";
import { SectionCard } from "@/components/ui";
import BulkDeleteClient from "@/components/settings/BulkDeleteClient";
import SubjectErasureClient from "@/components/settings/SubjectErasureClient";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export default async function DataPrivacySettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const ctx = await requirePagePermission(PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (!ctx) redirect("/settings");

  return (
    <SettingsPageShell
      title="Data & privacy"
      subtitle="How Unauth handles merchant and customer data, retention, and compliance."
    >
      <div className="space-y-3">
        <SectionCard title="How case data is scoped">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PrivacyBadge value="Merchant-owned context" />
            <span
              className="inline-flex items-center rounded-sm border px-2 py-0.5 text-mono-sm"
              style={{
                background: "var(--ua-privacy-bg)",
                borderColor: "var(--ua-privacy-border)",
                color: "var(--ua-privacy)",
              }}
            >
              tenant scoped
            </span>
          </div>
          <div
            className="rounded-md border p-4 text-mono-sm"
            style={{
              background: "var(--ua-surface-primary)",
              borderColor: "var(--ua-border-subtle)",
              color: "var(--data-id)",
            }}
          >
            source record -&gt; normalise -&gt; workspace scope -&gt; case context
          </div>
          <p
            className="mt-3 text-body-sm"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Customer identifiers are used to link merchant-owned orders, support
            tickets, evidence, decisions, and outcomes to the correct case.
            Access remains scoped to your workspace.
          </p>
        </SectionCard>

        <SectionCard title="Data scope">
          <p
            className="text-body-sm"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Unauth processes connected store, helpdesk, evidence, decision, and
            recovery data to support case review for your workspace. Customer
            history is supporting context for support decisions, not a reusable
            denial list.
          </p>
        </SectionCard>

        <SectionCard title="Retention, removal & deletion">
          <p
            className="text-body-sm"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Only raw ingestion payloads with an explicit deadline are removed
            automatically after terminal processing. No legal retention period
            is inferred for canonical case, financial, evidence, or audit
            records. Workspace removal hides the specific context listed below;
            full account deletion permanently removes merchant data.
          </p>
          <div className="mt-4">
            <BulkDeleteClient />
          </div>
        </SectionCard>

        <SectionCard title="Customer data erasure">
          <SubjectErasureClient />
        </SectionCard>

        <SectionCard title="Audit logging">
          <p
            className="text-body-sm"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            User actions, claim decisions, evidence attachments, and exports are
            recorded in an append-only audit trail for compliance review.
          </p>
          <Link
            href="/settings/audit-trail"
            className="mt-3 inline-block text-sm font-semibold hover:underline"
            style={{ color: "var(--ua-action-primary)" }}
          >
            View audit trail
          </Link>
        </SectionCard>

        <SectionCard title="Legal documents">
          <ul
            className="space-y-2 text-body-sm"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            <li>
              <Link
                href="/legal/privacy"
                className="font-semibold hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                href="/legal/data-handling"
                className="font-semibold hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Data handling statement
              </Link>
            </li>
            <li>
              <Link
                href="/legal/dpa"
                className="font-semibold hover:underline"
                style={{ color: "var(--ua-action-primary)" }}
              >
                Data processing agreement (DPA)
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>
    </SettingsPageShell>
  );
}
