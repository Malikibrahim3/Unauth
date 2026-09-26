import { redirect } from 'next/navigation';
import { AgreementSettingsClient, type AgreementSummary } from '@/components/settings/AgreementSettingsClient';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import { createServiceClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { acceptanceScenarioFromHeaders } from '@/lib/testing/acceptanceStateInjector';

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
  const forceEmpty = await acceptanceScenarioFromHeaders() === 'agreements-empty';
  const agreements = await Promise.all((forceEmpty ? [] : (data ?? []) as Array<AgreementSummary & { document_url?: string | null }>).map(async ({ document_url, ...agreement }) => {
    if (!document_url) return { ...agreement, source_url: null };
    const { data: signed } = await service.storage.from(STORAGE_BUCKETS.INTEGRATION_DOCUMENTS).createSignedUrl(document_url, 3600);
    return { ...agreement, source_url: signed?.signedUrl ?? null };
  }));

  return <AgreementSettingsClient initialAgreements={agreements} />;
}
