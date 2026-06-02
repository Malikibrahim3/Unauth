import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyDisconnectClient from '@/components/shopify/ShopifyDisconnectClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ShopifyIntegrationPage() {
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
    <div>
      <PageHeader
        eyebrow="Integrations"
        title="Shopify"
        subtitle="Sync orders, customers, refunds and fulfilment events in real time."
        breadcrumbs={[
          { label: 'Settings', href: '/settings/account' },
          { label: 'Integrations', href: '/settings/integrations' },
          { label: 'Shopify' },
        ]}
      />

      <div className="p-6 lg:p-8 max-w-2xl space-y-6">
        <Suspense fallback={null}>
          <ShopifyIntegrationBanner />
        </Suspense>
        <SyncStatusCard />
        {canManage && <ShopifyDisconnectClient />}
      </div>
    </div>
  );
}
