import { redirect } from 'next/navigation';
import { AgreementSettingsClient, type AgreementSummary } from '@/components/settings/AgreementSettingsClient';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';

export const dynamic = 'force-dynamic';

export default async function AgreementSettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const ctx = await requirePagePermission(PERMISSIONS.MANAGE_SETTINGS);
  if (!ctx) redirect('/settings/account');

  const service = createServiceClient();
  const { data, error } = await service
    .from(TABLES.AGREEMENTS)
    .select('id,agreement_type,counterparty_name,service_name,document_name,status,effective_from,effective_to,version_label,created_at')
    .eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error('Unable to load agreements.');

  return (
    <SettingsPageShell
      title="Agreements"
      subtitle="Keep verified commercial terms available for recovery review. Uploaded documents do not affect a case until a merchant approves their terms."
    >
      <AgreementSettingsClient initialAgreements={(data ?? []) as AgreementSummary[]} />
    </SettingsPageShell>
  );
}
