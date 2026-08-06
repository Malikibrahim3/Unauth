/**
 * Canonical UI route compatibility table.
 *
 * This CommonJS module is intentionally shared by Next configuration and the
 * TypeScript navigation layer so legacy URLs have one source of truth.
 */
const ROUTE_ALIASES = Object.freeze({
  '/inbox': '/cases',
  '/dashboard': '/overview',
  '/claims': '/cases',
  '/losses': '/financials/losses',
  '/recoveries': '/financials/recovery',
  '/reports': '/financials/reports',
  '/integrations': '/sources/connected',
  '/rules': '/controls/rules',
  '/flows': '/controls/flows',
  '/settings': '/settings/workspace/account',
});

const LEGACY_UI_REDIRECTS = Object.freeze([
  { source: '/', destination: '/landing', permanent: false },
  { source: '/inbox', destination: '/cases', permanent: false },
  { source: '/dashboard', destination: '/overview', permanent: false },
  { source: '/claims', destination: '/cases', permanent: false },
  { source: '/claims/:path*', destination: '/cases/:path*', permanent: false },
  { source: '/flows', destination: '/controls/flows', permanent: false },
  { source: '/flows/:path*', destination: '/controls/flows/:path*', permanent: false },
  { source: '/rules', destination: '/controls/rules', permanent: false },
  { source: '/rules/:path*', destination: '/controls/rules/:path*', permanent: false },
  { source: '/losses', destination: '/financials/losses', permanent: false },
  { source: '/losses/:path*', destination: '/financials/losses/:path*', permanent: false },
  { source: '/recoveries', destination: '/financials/recovery', permanent: false },
  { source: '/recoveries/:path*', destination: '/financials/recovery/:path*', permanent: false },
  { source: '/reports', destination: '/financials/reports', permanent: false },
  { source: '/reports/:path*', destination: '/financials/reports/:path*', permanent: false },
  { source: '/integrations/shipbob/select', destination: '/sources/setup/shipbob/select', permanent: false },
  { source: '/integrations', destination: '/sources/connected', permanent: false },
  { source: '/integrations/:path*', destination: '/sources/:path*', permanent: false },
  { source: '/settings', destination: '/settings/workspace/account', permanent: false },
  { source: '/settings/account', destination: '/settings/workspace/account', permanent: false },
  { source: '/settings/team', destination: '/settings/workspace/team', permanent: false },
  { source: '/settings/platform', destination: '/settings/product/platform', permanent: false },
  { source: '/settings/notifications', destination: '/settings/product/notifications', permanent: false },
  { source: '/settings/api-integrations', destination: '/settings/developers/api-access', permanent: false },
  { source: '/settings/audit-trail', destination: '/settings/governance/audit-trail', permanent: false },
  { source: '/settings/data-privacy', destination: '/settings/legal/data-privacy', permanent: false },
  { source: '/settings/agreements', destination: '/settings/legal/agreements', permanent: false },
  { source: '/settings/integrations', destination: '/sources/connected', permanent: false },
  { source: '/settings/integrations/:provider', destination: '/sources/setup/:provider', permanent: false },
  { source: '/exceptions', destination: '/work?view=integration-exceptions', permanent: false },
  { source: '/catches/:path*', destination: '/cases', permanent: false },
  { source: '/chargebacks/:path*', destination: '/cases', permanent: false },
  { source: '/evidence', destination: '/cases', permanent: false },
  { source: '/evidence-packages', destination: '/cases', permanent: false },
  { source: '/store/:path*', destination: '/overview', permanent: false },
  { source: '/lookup/:path*', destination: '/customers', permanent: false },
  { source: '/global/:path*', destination: '/customers', permanent: false },
  { source: '/graph/:path*', destination: '/customers', permanent: false },
  { source: '/clusters/:path*', destination: '/customers', permanent: false },
  { source: '/watchlist/:path*', destination: '/customers', permanent: false },
  { source: '/audit/:path*', destination: '/financials/reports', permanent: false },
  { source: '/report/:path*', destination: '/financials/reports', permanent: false },
  { source: '/audits/:path*', destination: '/financials/reports', permanent: false },
  { source: '/audit-history', destination: '/financials/reports', permanent: false },
  { source: '/history/:path*', destination: '/financials/reports', permanent: false },
  { source: '/saved/:path*', destination: '/financials/reports', permanent: false },
  { source: '/new-audit', destination: '/sources/imports', permanent: false },
  { source: '/upload/:path*', destination: '/sources/imports', permanent: false },
  { source: '/network-metrics/:path*', destination: '/overview', permanent: false },
  { source: '/eval/:path*', destination: '/overview', permanent: false },
  { source: '/help/identity-matching', destination: '/help', permanent: false },
  { source: '/help/confidence-grades', destination: '/help', permanent: false },
  { source: '/help/how-it-works', destination: '/help', permanent: false },
  { source: '/help/integrations/siena', destination: '/help', permanent: false },
  { source: '/help/integrations/yuma', destination: '/help', permanent: false },
  { source: '/partners', destination: '/controls/rules', permanent: false },
]);

function resolveCanonicalHref(href) {
  const path = href.split('?')[0] || href;
  return ROUTE_ALIASES[path] || path;
}

module.exports = { LEGACY_UI_REDIRECTS, ROUTE_ALIASES, resolveCanonicalHref };
