/** Route aliases that redirect to a canonical app surface. */
export const ROUTE_ALIASES: Record<string, string> = {
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
};

export function resolveCanonicalHref(href: string): string {
  const path = href.split('?')[0] ?? href;
  return ROUTE_ALIASES[path] ?? path;
}
