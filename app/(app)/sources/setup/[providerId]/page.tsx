import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { SourceSetupWizard } from '@/components/sources/SourceSetupWizard';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { loadProviderConnectionReadModel } from '@/lib/connections/loadProviderConnectionReadModel';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { TABLES } from '@/lib/supabase/tables';

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

  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect('/sources/connected');
  await delayForAcceptanceScenario('settings-form-loading-families', 5_000);
  await throwForAcceptanceScenario('connector-setup-error');
  const [catalogue, canManage, chromeKeys] = await Promise.all([
    loadConnectorCatalogue(service, ctx.merchantId),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
    providerId === 'chrome'
      ? service.from(TABLES.MERCHANT_API_KEYS).select('id').eq('merchant_id', ctx.merchantId).is('revoked_at', null).limit(1)
      : Promise.resolve({ data: null, error: null }),
  ]);
  const catalogueItem = catalogue.find((candidate) => candidate.id === providerId);
  const item = catalogueItem ?? (providerId === 'chrome' ? {
    id: 'chrome',
    name: 'Chrome extension',
    description: 'Local browser extension for staff-side evidence capture. Installation is manual while store distribution is unavailable.',
    stage: 'partial',
    capabilities: [{ id: 'case_context.read', description: 'Read scoped case context through an API key', level: 'read' as const, support: 'supported' }],
    freshness: { deliveryModel: 'on_demand' },
    connectEnabled: true,
  } : null);
  if (!item) notFound();
  const providerState = catalogueItem ? await loadProviderConnectionReadModel({ service, merchantId: ctx.merchantId, item: catalogueItem }) : {
    readModel: {
      configuration: chromeKeys.data?.length ? 'configured' as const : 'not_configured' as const,
      operational: chromeKeys.data?.length ? 'attention' as const : 'unknown' as const,
    },
    badge: chromeKeys.data?.length ? 'verification_unavailable' as const : 'disconnected' as const,
    displayNote: chromeKeys.data?.length ? 'An active API key exists. Extension installation cannot be verified from this page.' : 'Create an API key before installing the extension.',
  };
  const { readModel, badge, displayNote } = providerState;
  const setupSteps = ['provider', 'permissions', 'mapping', 'history', 'schedule', 'review', 'activate'] as const;
  type SetupStep = (typeof setupSteps)[number];
  const legacyStep: Record<string, SetupStep> = { connect: 'permissions', backfill: 'history', verify: 'review' };
  const requestedStep = legacyStep[resolvedSearch.step ?? ''] ?? resolvedSearch.step;
  const resumeStep = readModel.configuration === 'configured' ? 'review' : 'permissions';
  const selectedStep: SetupStep = setupSteps.includes(requestedStep as SetupStep) ? requestedStep as SetupStep : resumeStep;
  // The action itself owns credential prerequisites and confirmation. Redirecting
  // unconfigured merchants away from it prevents them from connecting at all.
  const currentStep = selectedStep;
  const currentIndex = setupSteps.indexOf(currentStep);
  const stepHref = (step: SetupStep) => {
    const params = new URLSearchParams({ step });
    if (returnTo !== `/sources/${providerId}`) params.set('returnTo', returnTo);
    return `/sources/setup/${providerId}?${params.toString()}`;
  };

  return (
    <>
      <SetBreadcrumbLabel label={`Connect ${item.name}`} detail={`step ${currentIndex + 1} of 7 · viewing steps does not verify setup`}/>
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>Connect {item.name}</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <span style={{ flex: 1, font: "400 12.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{catalogueItem ? `${item.name} setup keeps provider access, field coverage and activation as separate decisions.` : 'This local setup explains the extension boundary before any package is downloaded.'}</span>
        <Link href={currentIndex > 0 ? stepHref(setupSteps[currentIndex - 1]!) : returnTo} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', textDecoration: 'none' }}>{currentIndex > 0 ? 'Back' : 'Cancel setup'}</Link>
        {currentIndex < setupSteps.length - 1 ? <Link href={stepHref(setupSteps[currentIndex + 1]!)} style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Continue to {setupSteps[currentIndex + 1]}</Link> : <Link href={returnTo} style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Return to source</Link>}
      </div>
      <div data-screen-label="Provider setup" data-visual-world="supplied-package" data-surface-id="provider-specific-connector-setup" data-archetype="P3-connector-setup" tabIndex={0} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px 20px' }}>
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
        initialStep={currentStep}
        returnTo={returnTo}
      />
      </div>
    </>
  );
}
