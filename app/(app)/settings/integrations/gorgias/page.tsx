import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import GorgiasSetupClient from '@/components/settings/GorgiasSetupClient';
import GorgiasSupportSyncClient from '@/components/settings/GorgiasSupportSyncClient';
import { SettingsPageShell } from '@/components/ui';

export default async function GorgiasIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManageGorgias = !manageCheck.denied;

  return (
    <SettingsPageShell
      eyebrow="Integrations"
      title="Gorgias"
      subtitle="Show payout case context, evidence gaps, and recommendations on support tickets."
      breadcrumbs={[
        { label: 'Settings', href: '/settings/account' },
        { label: 'Integrations', href: '/integrations' },
        { label: 'Gorgias' },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <GorgiasSupportSyncClient canManage={canManageGorgias} />
        <GorgiasSetupClient />
      </div>
    </SettingsPageShell>
  );
}
