import { redirect } from 'next/navigation';
import { AgreementSettingsClient, type AgreementSummary } from '@/components/settings/AgreementSettingsClient';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import { createServiceClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';

export const dynamic = 'force-dynamic';

export default async function AgreementSettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const ctx = await requirePagePermission(PERMISSIONS.MANAGE_SETTINGS);
  if (!ctx) redirect('/settings/workspace/account');

  const service = createServiceClient();
  const { data, error } = await service
    .from(TABLES.AGREEMENTS)
    .select('id,agreement_type,counterparty_name,service_name,document_name,document_url,file_mime_type,file_size_bytes,status,effective_from,effective_to,version_label,created_at')
    .eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load agreements.');
  const agreements = await Promise.all(((data ?? []) as Array<AgreementSummary & { document_url?: string | null }>).map(async ({ document_url, ...agreement }) => {
    if (!document_url) return { ...agreement, source_url: null };
    const { data: signed } = await service.storage.from(STORAGE_BUCKETS.INTEGRATION_DOCUMENTS).createSignedUrl(document_url, 3600);
    return { ...agreement, source_url: signed?.signedUrl ?? null };
  }));

  return (
    <SettingsPageShell
      title="Agreements"
      subtitle="Partner and service agreements, the recovery terms extracted from them, and the surfaces that depend on those terms being approved."
      surfaceId="agreements"
      layout="wide"
      truth={{
        access: "Members with Manage settings permission",
        currentState: "Stored source documents and separately approved recovery terms",
        saveBehavior: "Upload stores a source only; each verified term needs a separate approval",
        impact: "Only approved terms can guide future recovery work; existing submitted claims retain their version",
      }}
    >
      <AgreementSettingsClient initialAgreements={agreements} />
    </SettingsPageShell>
  );
}
