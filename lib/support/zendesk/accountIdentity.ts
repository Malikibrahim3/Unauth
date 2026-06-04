export function normalizeZendeskSubdomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.replace(/\/.*$/, '');
  if (value.endsWith('.zendesk.com')) {
    value = value.slice(0, -'.zendesk.com'.length);
  }
  const subdomain = value.split('.')[0]?.trim();
  if (!subdomain) {
    throw new Error('invalid_zendesk_subdomain');
  }
  return subdomain;
}

export function zendeskBaseUrlFromSubdomain(subdomain: string): string {
  return `https://${normalizeZendeskSubdomain(subdomain)}.zendesk.com`;
}
