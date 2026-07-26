import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyDisconnectClient from '@/components/shopify/ShopifyDisconnectClient';
import { SettingsPageShell } from '@/components/ui';

export default async function ShopifyIntegrationPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const manageCheck = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  const canManage = !manageCheck.denied;

  return (
    <SettingsPageShell
      title="Shopify"
      subtitle="Sync orders, customers, refunds, and fulfillment events in real time."
    >
      <div className="space-y-3">
        <Suspense fallback={null}>
          <ShopifyIntegrationBanner />
        </Suspense>
        <SyncStatusCard />
        {canManage && <ShopifyDisconnectClient />}
      </div>
    </SettingsPageShell>
  );
}
