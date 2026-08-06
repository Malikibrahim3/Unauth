import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyDisconnectClient from '@/components/shopify/ShopifyDisconnectClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
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
      <ConnectorSetupShell
        provider="Shopify"
        providerMark="/providers/shopify.svg"
        requirements="Sign in to the Shopify store as an administrator. Authorization requests read-only commerce and fulfilment access."
      >
        <ShopifyIntegrationBanner />
        <SyncStatusCard />
        {canManage && <ShopifyDisconnectClient />}
      </ConnectorSetupShell>
    </SettingsPageShell>
  );
}
