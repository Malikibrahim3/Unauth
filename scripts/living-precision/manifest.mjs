import { MARKETING_STORY } from '../marketing-seed/manifest.mjs';

const capture = MARKETING_STORY.capture;

const product = (id, route, file, family, capturePath = route, options = {}) =>
  Object.freeze({
    id,
    route,
    file,
    classification: 'production',
    session: 'authenticated',
    family,
    capturePath,
    edge: Boolean(options.edge),
    flagship: Boolean(options.flagship),
  });

const development = (id, route, file, family) =>
  Object.freeze({
    id,
    route,
    file,
    classification: 'development',
    session: 'authenticated',
    family,
    capturePath: route,
    edge: false,
    flagship: false,
  });

const redirect = (id, route, file, destination, proofPaths) =>
  Object.freeze({
    id,
    route,
    file,
    classification: 'redirect',
    session: 'authenticated',
    family: 'redirect',
    destination,
    proofPaths: Object.freeze(proofPaths),
    edge: false,
    flagship: false,
  });

/** Every App Router page module belongs here exactly once. */
export const LIVING_PRECISION_ROUTES = Object.freeze([
  product('R01', '/claims/[id]', 'app/(app)/claims/[id]/page.tsx', 'case-detail', `/claims/${capture.caseDecisionReady}`, { edge: true, flagship: true }),
  product('R02', '/claims', 'app/(app)/claims/page.tsx', 'operational-registry', '/claims', { edge: true, flagship: true }),
  redirect('R03', '/customers/[id]/claims', 'app/(app)/customers/[id]/claims/page.tsx', '/claims/[claimId] or /customers/[id]#cases', [
    `/customers/${capture.customer}/claims?claimId=${capture.caseDecisionReady}`,
    `/customers/${capture.customer}/claims?capture=1#source`,
  ]),
  product('R04', '/customers/[id]/evidence/new', 'app/(app)/customers/[id]/evidence/new/page.tsx', 'task', `/customers/${capture.customer}/evidence/new`),
  product('R05', '/customers/[id]', 'app/(app)/customers/[id]/page.tsx', 'customer-detail', `/customers/${capture.customer}`, { edge: true }),
  product('R06', '/customers', 'app/(app)/customers/page.tsx', 'operational-registry', '/customers'),
  product('R07', '/dashboard', 'app/(app)/dashboard/page.tsx', 'analytical', '/dashboard', { edge: true, flagship: true }),
  development('R08', '/dev/design-system', 'app/(app)/dev/design-system/page.tsx', 'development-harness'),
  product('R09', '/disputes/[id]', 'app/(app)/disputes/[id]/page.tsx', 'connected-object', `/disputes/${capture.dispute}`),
  redirect('R10', '/exceptions', 'app/(app)/exceptions/page.tsx', '/work?view=integration-exceptions', [
    '/exceptions?capture=1',
    '/exceptions?capture=1&source=matrix#queue',
  ]),
  product('R11', '/losses/[id]', 'app/(app)/losses/[id]/page.tsx', 'loss-detail', `/losses/${capture.loss}`),
  product('R12', '/losses', 'app/(app)/losses/page.tsx', 'analytical-registry', '/losses', { edge: true }),
  product('R13', '/notifications', 'app/(app)/notifications/page.tsx', 'operational-registry', '/notifications'),
  product('R14', '/orders/[id]', 'app/(app)/orders/[id]/page.tsx', 'connected-object', `/orders/${capture.order}`),
  product('R15', '/recoveries/[id]', 'app/(app)/recoveries/[id]/page.tsx', 'recovery-detail', `/recoveries/${capture.recovery}`),
  product('R16', '/recoveries', 'app/(app)/recoveries/page.tsx', 'operational-board', '/recoveries', { edge: true }),
  product('R17', '/refunds/[id]', 'app/(app)/refunds/[id]/page.tsx', 'connected-object', `/refunds/${capture.refund}`),
  product('R18', '/returns/[id]', 'app/(app)/returns/[id]/page.tsx', 'connected-object', `/returns/${capture.return}`),
  product('R19', '/shipments/[id]', 'app/(app)/shipments/[id]/page.tsx', 'connected-object', `/shipments/${capture.shipment}`),
  product('R20', '/tickets/[id]', 'app/(app)/tickets/[id]/page.tsx', 'connected-object', `/tickets/${capture.ticket}`),
  product('R21', '/work', 'app/(app)/work/page.tsx', 'operational-registry', '/work', { edge: true, flagship: true }),
  product('R22', '/flows/[id]', 'app/(app)/flows/[id]/page.tsx', 'builder-detail', `/flows/${capture.flow}`, { edge: true }),
  product('R23', '/flows', 'app/(app)/flows/page.tsx', 'registry', '/flows'),
  product('R24', '/flows/runs/[id]', 'app/(app)/flows/runs/[id]/page.tsx', 'run-detail', `/flows/runs/${capture.flowRun}`),
  product('R25', '/flows/runs', 'app/(app)/flows/runs/page.tsx', 'registry', '/flows/runs'),
  product('R26', '/help', 'app/(app)/help/page.tsx', 'editorial-task', '/help'),
  product('R27', '/integrations/[provider]', 'app/(app)/integrations/[provider]/page.tsx', 'connector-detail', '/integrations/shopify', { edge: true }),
  development('R28', '/integrations/dev-preview', 'app/(app)/integrations/dev-preview/page.tsx', 'development-harness'),
  product('R29', '/integrations/imports', 'app/(app)/integrations/imports/page.tsx', 'task', '/integrations/imports'),
  product('R30', '/integrations', 'app/(app)/integrations/page.tsx', 'registry', '/integrations'),
  product('R31', '/integrations/shipbob/select', 'app/(app)/integrations/shipbob/select/page.tsx', 'task', `/integrations/shipbob/select?selection=${capture.shipbobSelection}`),
  product('R32', '/reports', 'app/(app)/reports/page.tsx', 'analytical', `/reports?range=${capture.reportRange}`, { edge: true, flagship: true }),
  product('R33', '/reports/records', 'app/(app)/reports/records/page.tsx', 'registry', `/reports/records?range=${capture.reportRange}`),
  product('R34', '/rules/[id]', 'app/(app)/rules/[id]/page.tsx', 'builder-detail', `/rules/${capture.rule}`, { edge: true }),
  product('R35', '/rules', 'app/(app)/rules/page.tsx', 'registry', '/rules'),
  product('R36', '/rules/recovery', 'app/(app)/rules/recovery/page.tsx', 'settings-task', '/rules/recovery'),
  product('R37', '/settings/account', 'app/(app)/settings/account/page.tsx', 'settings', '/settings/account', { edge: true }),
  product('R38', '/settings/agreements', 'app/(app)/settings/agreements/page.tsx', 'settings', '/settings/agreements'),
  product('R39', '/settings/api-integrations', 'app/(app)/settings/api-integrations/page.tsx', 'settings', '/settings/api-integrations'),
  product('R40', '/settings/audit-trail', 'app/(app)/settings/audit-trail/page.tsx', 'settings', '/settings/audit-trail'),
  product('R41', '/settings/billing', 'app/(app)/settings/billing/page.tsx', 'settings', '/settings/billing'),
  product('R42', '/settings/data-privacy', 'app/(app)/settings/data-privacy/page.tsx', 'settings', '/settings/data-privacy'),
  product('R43', '/settings/integrations/chrome', 'app/(app)/settings/integrations/chrome/page.tsx', 'connector-setup', '/settings/integrations/chrome'),
  product('R44', '/settings/integrations/freshdesk', 'app/(app)/settings/integrations/freshdesk/page.tsx', 'connector-setup', '/settings/integrations/freshdesk'),
  product('R45', '/settings/integrations/gorgias', 'app/(app)/settings/integrations/gorgias/page.tsx', 'connector-setup', '/settings/integrations/gorgias'),
  product('R46', '/settings/integrations/shopify', 'app/(app)/settings/integrations/shopify/page.tsx', 'connector-setup', '/settings/integrations/shopify'),
  product('R47', '/settings/integrations/zendesk', 'app/(app)/settings/integrations/zendesk/page.tsx', 'connector-setup', '/settings/integrations/zendesk'),
  product('R48', '/settings/notifications', 'app/(app)/settings/notifications/page.tsx', 'settings', '/settings/notifications'),
  redirect('R49', '/settings', 'app/(app)/settings/page.tsx', '/settings/account', [
    '/settings?capture=1',
    '/settings?capture=1&source=matrix#profile',
  ]),
  product('R50', '/settings/platform', 'app/(app)/settings/platform/page.tsx', 'settings', '/settings/platform'),
  product('R51', '/settings/team', 'app/(app)/settings/team/page.tsx', 'settings', '/settings/team'),
  product('R52', '/login', 'app/(auth)/login/page.tsx', 'entry', '/login', { edge: true }),
  product('R53', '/reset', 'app/(auth)/reset/page.tsx', 'entry', '/reset'),
  product('R54', '/reset/update', 'app/(auth)/reset/update/page.tsx', 'entry', '/reset/update'),
  product('R55', '/demo', 'app/(public)/demo/page.tsx', 'public-product', '/demo?step=evidence', { edge: true, flagship: true }),
  product('R56', '/landing', 'app/(public)/landing/page.tsx', 'public-marketing', '/landing', { edge: true, flagship: true }),
  product('R57', '/legal/data-handling', 'app/(public)/legal/data-handling/page.tsx', 'public-editorial', '/legal/data-handling'),
  product('R58', '/legal/dpa', 'app/(public)/legal/dpa/page.tsx', 'public-editorial', '/legal/dpa'),
  product('R59', '/legal/pilot-terms', 'app/(public)/legal/pilot-terms/page.tsx', 'public-editorial', '/legal/pilot-terms'),
  product('R60', '/legal/privacy', 'app/(public)/legal/privacy/page.tsx', 'public-editorial', '/legal/privacy'),
  product('R61', '/pricing', 'app/(public)/pricing/page.tsx', 'public-marketing', '/pricing'),
  product('R62', '/signup', 'app/(public)/signup/page.tsx', 'entry', '/signup'),
  Object.freeze({
    ...product('R63', '/onboarding', 'app/onboarding/page.tsx', 'onboarding', '/onboarding', { edge: true }),
    session: 'onboarding',
  }),
  Object.freeze({
    ...redirect('R64', '/', 'app/page.tsx', '/landing', [
      '/?capture=1',
      '/?capture=1&source=matrix#product',
    ]),
    session: 'anonymous',
  }),
  Object.freeze({
    ...development(
      'R65',
      '/landing/prototypes/unauth-case-detail',
      'app/(public)/landing/prototypes/unauth-case-detail/page.tsx',
      'archived-research',
    ),
    session: 'anonymous',
  }),
].map((entry) => {
  if (entry.id >= 'R52' && entry.id <= 'R62') {
    return Object.freeze({ ...entry, session: 'anonymous' });
  }
  return entry;
}));

export const ROUTE_COUNTS = Object.freeze({
  production: LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'production').length,
  development: LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'development').length,
  redirect: LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'redirect').length,
});

export const AUTHENTICATED_PAGE_FAMILY_EDGE_ROUTES = Object.freeze(
  LIVING_PRECISION_ROUTES.filter(
    (route) => route.session === 'authenticated' && route.classification === 'production' && route.edge,
  ),
);

export const FLAGSHIP_ROUTES = Object.freeze(
  LIVING_PRECISION_ROUTES.filter((route) => route.classification === 'production' && route.flagship),
);
