import { notFound, redirect } from 'next/navigation';
import { ButtonLink, PageFrame } from '@/components/ui';
import { SourceSetupWizard } from '@/components/sources/SourceSetupWizard';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import ChromeSetupPage from '@/components/sources/setup/ChromeSetupPage';
import FreshdeskSetupPage from '@/components/sources/setup/FreshdeskSetupPage';
import GorgiasSetupPage from '@/components/sources/setup/GorgiasSetupPage';
import ShopifySetupPage from '@/components/sources/setup/ShopifySetupPage';
import ZendeskSetupPage from '@/components/sources/setup/ZendeskSetupPage';
import { loadProviderConnectionReadModel } from '@/lib/connections/loadProviderConnectionReadModel';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

export const dynamic = 'force-dynamic';

export default async function SourceSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ returnTo?: string; step?: string }>;
}) {
  const { providerId } = await params;
  const resolvedSearch = await searchParams;
  const returnTo = safeRedirectPath(resolvedSearch.returnTo ?? `/sources/${providerId}`);

  if (providerId === 'chrome') return <ChromeSetupPage returnTo={returnTo} />;
  if (providerId === 'freshdesk') return <FreshdeskSetupPage returnTo={returnTo} />;
  if (providerId === 'gorgias') return <GorgiasSetupPage returnTo={returnTo} />;
  if (providerId === 'shopify') return <ShopifySetupPage returnTo={returnTo} />;
  if (providerId === 'zendesk') return <ZendeskSetupPage returnTo={returnTo} />;

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
  const { readModel, badge, displayNote } = await loadProviderConnectionReadModel({
    service,
    merchantId: ctx.merchantId,
    item,
  });
  const setupSteps = ['provider', 'permissions', 'mapping', 'history', 'schedule', 'review', 'activate'] as const;
  type SetupStep = (typeof setupSteps)[number];
  const legacyStep: Record<string, SetupStep> = { connect: 'permissions', backfill: 'history', verify: 'review' };
  const requestedStep = legacyStep[resolvedSearch.step ?? ''] ?? resolvedSearch.step;
  const currentStep: SetupStep = setupSteps.includes(requestedStep as SetupStep) ? requestedStep as SetupStep : 'provider';
  const currentIndex = setupSteps.indexOf(currentStep);
  const stepHref = (step: SetupStep) => {
    const params = new URLSearchParams({ step });
    if (returnTo !== `/sources/${providerId}`) params.set('returnTo', returnTo);
    return `/sources/setup/${providerId}?${params.toString()}`;
  };

  return (
    <PageFrame
      surfaceId="provider-specific-connector-setup"
      archetype="P3-connector-setup"
      title={`Connect ${item.name}`}
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: item.name, href: `/sources/${item.id}` }, { label: 'Setup' }]}
      actions={(
        <>
          <ButtonLink href={returnTo} variant="secondary" size="sm">Cancel setup</ButtonLink>
          {currentIndex > 0 ? <ButtonLink href={stepHref(setupSteps[currentIndex - 1]!)} variant="secondary" size="sm">Back</ButtonLink> : null}
          {currentIndex < setupSteps.length - 1 ? <ButtonLink href={stepHref(setupSteps[currentIndex + 1]!)} size="sm">Continue</ButtonLink> : null}
        </>
      )}
    >
      <SourceSetupWizard
        providerId={item.id}
        providerName={item.name}
        configuration={readModel.configuration}
        operational={readModel.operational}
        badge={badge}
        connectionNote={displayNote}
        stage={item.stage}
        description={item.description}
        capabilities={item.capabilities}
        deliveryModel={item.freshness.deliveryModel}
        connectEnabled={item.connectEnabled}
        canManage={canManage}
        initialStep={resolvedSearch.step}
        returnTo={returnTo}
      />
    </PageFrame>
  );
}
