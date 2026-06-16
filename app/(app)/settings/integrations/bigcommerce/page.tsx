import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import BigCommerceConnectClient from '@/components/settings/BigCommerceConnectClient';
import { SettingsPageShell } from '@/components/ui';

export default async function BigCommerceIntegrationPage() {
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
      title="BigCommerce"
      subtitle="Authorize via OAuth to sync orders and refunds into audit transactions."
      breadcrumbs={[
        { label: 'Settings', href: '/settings/account' },
        { label: 'Integrations', href: '/settings/integrations' },
        { label: 'BigCommerce' },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <Suspense fallback={<p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>}>
          <BigCommerceConnectClient canManage={canManage} />
        </Suspense>
      </div>
    </SettingsPageShell>
  );
}
