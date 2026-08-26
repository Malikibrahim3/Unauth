import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ShopifyIntegrationBanner from '@/components/shopify/ShopifyIntegrationBanner';
import SyncStatusCard from '@/components/shopify/SyncStatusCard';
import ShopifyDisconnectClient from '@/components/shopify/ShopifyDisconnectClient';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ButtonLink, PageFrame } from '@/components/ui';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';

export default async function ShopifyIntegrationPage({ returnTo }: { returnTo?: string }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/sources/connected');

  const [manageCheck, connection] = await Promise.all([
    requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS),
    getShopifyConnectionStatus(service, ctx.merchantId),
  ]);
  const canManage = !manageCheck.denied;
  const setupMode = connection.linkState === 'connected'
    ? 'verify'
    : connection.linkState === 'not_connected'
      ? 'connect'
      : 'reconnect';

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title="Connect Shopify"
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Shopify' }]}
      actions={<><ButtonLink href={returnTo ?? '/sources/shopify'} variant="secondary" size="sm">Cancel setup</ButtonLink><ButtonLink href="#connector-setup-form" size="sm">Continue</ButtonLink></>}
    >
      <ConnectorSetupShell
        provider="Shopify"
        providerMark="/providers/shopify.svg"
        requirements="Sign in to the Shopify store as an administrator. Authorization requests read-only commerce and fulfilment access."
        setupMode={setupMode}
        currentStage={setupMode === 'verify' ? 'verify' : 'connect'}
        returnHref={returnTo}
      >
        <ShopifyIntegrationBanner />
        <SyncStatusCard />
        {canManage && connection.connected ? <ShopifyDisconnectClient /> : null}
      </ConnectorSetupShell>
    </PageFrame>
  );
}
