import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import FreshdeskSupportSyncClient from '@/components/settings/FreshdeskSupportSyncClient';
import { SettingsPageShell } from '@/components/ui';

export default async function FreshdeskIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageFreshdesk = !manageCheck.denied;

  return (
    <SettingsPageShell
      eyebrow="Integrations"
      title="Freshdesk"
      subtitle="Ingest support tickets for claim detection and dispute context."
      breadcrumbs={[
        { label: 'Settings', href: '/settings/account' },
        { label: 'Integrations', href: '/settings/integrations' },
        { label: 'Freshdesk' },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <FreshdeskSupportSyncClient canManage={canManageFreshdesk} />
      </div>
    </SettingsPageShell>
  );
}
