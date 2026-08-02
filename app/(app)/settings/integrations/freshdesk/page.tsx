import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import FreshdeskSupportSyncClient from '@/components/settings/FreshdeskSupportSyncClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { SettingsPageShell } from '@/components/ui';

export default async function FreshdeskIntegrationPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageFreshdesk = !manageCheck.denied;

  return (
    <SettingsPageShell
      title="Freshdesk"
      subtitle="Ingest support tickets for claim detection and dispute context."
    >
      <ConnectorSetupShell
        provider="Freshdesk"
        providerMark="/integrations/freshdesk.png"
        requirements="You need a Freshdesk domain, an API key with ticket access, and permission to add the provider webhook."
      >
        <FreshdeskSupportSyncClient canManage={canManageFreshdesk} />
      </ConnectorSetupShell>
    </SettingsPageShell>
  );
}
