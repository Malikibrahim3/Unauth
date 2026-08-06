import { notFound, redirect } from 'next/navigation';
import { PageFrame } from '@/components/ui';
import { SourceSetupWizard } from '@/components/sources/SourceSetupWizard';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import ChromeSetupPage from '@/components/sources/setup/ChromeSetupPage';
import FreshdeskSetupPage from '@/components/sources/setup/FreshdeskSetupPage';
import GorgiasSetupPage from '@/components/sources/setup/GorgiasSetupPage';
import ShopifySetupPage from '@/components/sources/setup/ShopifySetupPage';
import ZendeskSetupPage from '@/components/sources/setup/ZendeskSetupPage';

export const dynamic = 'force-dynamic';

export default async function SourceSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { providerId } = await params;

  if (providerId === 'chrome') return <ChromeSetupPage />;
  if (providerId === 'freshdesk') return <FreshdeskSetupPage />;
  if (providerId === 'gorgias') return <GorgiasSetupPage searchParams={searchParams} />;
  if (providerId === 'shopify') return <ShopifySetupPage />;
  if (providerId === 'zendesk') return <ZendeskSetupPage />;

  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect('/sources/connected');
  const [catalogue, canManage] = await Promise.all([
    loadConnectorCatalogue(service, ctx.merchantId),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const item = catalogue.find((candidate) => candidate.id === providerId);
  if (!item) notFound();
  return (
    <PageFrame
      eyebrow="Sources"
      title={`Set up ${item.name}`}
      subtitle="Review every connection boundary before activation: permission scope, mapping, historical coverage, schedule, test, and explicit activation."
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: item.name, href: `/sources/${item.id}` }, { label: 'Setup' }]}
    >
      <SourceSetupWizard providerId={item.id} providerName={item.name} status={item.status} description={item.description} capabilities={item.capabilities} canManage={canManage} />
    </PageFrame>
  );
}
