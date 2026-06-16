import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import WooCommerceConnectClient from '@/components/settings/WooCommerceConnectClient';
import { SettingsPageShell } from '@/components/ui';

export default async function WooCommerceIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manageCheck.denied;

  return (
    <SettingsPageShell
      eyebrow="Integrations"
      title="WooCommerce"
      subtitle="Sync orders and refunds into audit transactions using REST API keys."
      breadcrumbs={[
        { label: 'Settings', href: '/settings/account' },
        { label: 'Integrations', href: '/settings/integrations' },
        { label: 'WooCommerce' },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <WooCommerceConnectClient canManage={canManage} />
      </div>
    </SettingsPageShell>
  );
}
