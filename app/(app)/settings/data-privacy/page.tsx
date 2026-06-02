import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { SectionCard } from '@/components/ui';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';

export default async function DataPrivacySettingsPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (denied) redirect('/settings');

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Data &amp; privacy</h1>
      <p className="text-body-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
        How Unauth handles merchant and customer data, retention, and compliance.
      </p>

      <div className="mt-6 space-y-4">
        <SectionCard title="Data scope">
          <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
            Unauth processes order exports and Shopify sync data to support identity matching and claim
            review for your store. Cross-merchant signals are aggregated
            and anonymised before network comparison.
          </p>
        </SectionCard>

        <SectionCard title="Retention & deletion">
          <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
            Audit runs and associated transaction data are retained according to your plan settings.
            Account deletion permanently removes audits, customer profiles, watchlist entries, and notes.
            Contact support if you need help removing data before closing your account.
          </p>
          <div className="mt-4">
            <BulkDeleteClient />
          </div>
        </SectionCard>

        <SectionCard title="Audit logging">
          <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
            User actions, claim decisions, evidence attachments, and exports are recorded in an
            append-only audit trail for compliance review.
          </p>
          <Link
            href="/settings/audit-trail"
            className="mt-3 inline-block text-sm font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            View audit trail →
          </Link>
        </SectionCard>

        <SectionCard title="Legal documents">
          <ul className="space-y-2 text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
            <li>
              <Link href="/legal/privacy" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/legal/data-handling" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Data handling statement
              </Link>
            </li>
            <li>
              <Link href="/legal/dpa" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Data processing agreement (DPA)
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
