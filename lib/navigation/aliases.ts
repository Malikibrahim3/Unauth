/** Route aliases that redirect to a canonical app surface. */
export const ROUTE_ALIASES: Record<string, string> = {
  '/inbox': '/claims',
};

export function resolveCanonicalHref(href: string): string {
  const path = href.split('?')[0] ?? href;
  return ROUTE_ALIASES[path] ?? path;
}
