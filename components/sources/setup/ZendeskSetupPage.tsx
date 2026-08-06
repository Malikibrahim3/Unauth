import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ZendeskSetupClient from '@/components/settings/ZendeskSetupClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { SettingsPageShell } from '@/components/ui';

export default async function ZendeskIntegrationPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');
  const manage = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manage.denied;

  return (
    <SettingsPageShell
      title="Zendesk"
      subtitle="Show case context, evidence gaps, and recommendations on support tickets."
    >
      <ConnectorSetupShell
        provider="Zendesk"
        providerMark="/providers/zendesk.svg"
        requirements="You need Zendesk admin access to install the private app, add the ticket webhook, and create a token for ticket history."
      >
        <ZendeskSetupClient canManage={canManage} />
      </ConnectorSetupShell>
    </SettingsPageShell>
  );
}
