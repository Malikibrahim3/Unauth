import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ZendeskSetupClient from '@/components/settings/ZendeskSetupClient';
import { SettingsPageShell } from '@/components/ui';

export default async function ZendeskIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');
  const manage = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manage.denied;

  return (
    <SettingsPageShell
      eyebrow="Integrations"
      title="Zendesk"
      subtitle="Show payout case context, evidence gaps, and recommendations on support tickets."
      breadcrumbs={[
        { label: 'Settings', href: '/settings/account' },
        { label: 'Integrations', href: '/settings/integrations' },
        { label: 'Zendesk' },
      ]}
    >
      <div className="space-y-3">
        <ZendeskSetupClient canManage={canManage} />
      </div>
    </SettingsPageShell>
  );
}
