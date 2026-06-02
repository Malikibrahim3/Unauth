import { FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM } from '@/lib/support/freshdesk/supportConnectionShared';

export const FRESHDESK_DOMAIN_HEADER = 'x-freshdesk-domain';

export type FreshdeskAccountIdentity = {
  provider_account_id: string | null;
  domain: string | null;
  provider_base_url: string | null;
  source: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeFreshdeskDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.split('/')[0] ?? normalized;
  normalized = normalized.replace(/\.$/, '');
  if (!normalized.includes('.')) {
    normalized = `${normalized}.freshdesk.com`;
  }
  return normalized;
}

export function freshdeskBaseUrlFromDomain(domain: string): string {
  return `https://${normalizeFreshdeskDomain(domain)}`;
}

export function normalizeFreshdeskBaseUrl(url: string): string {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return `https://${parsed.hostname.toLowerCase()}`;
  } catch {
    return freshdeskBaseUrlFromDomain(url);
  }
}

function identityFromDomain(domain: string, source: string): FreshdeskAccountIdentity {
  const normalized = normalizeFreshdeskDomain(domain);
  return {
    provider_account_id: normalized,
    domain: normalized,
    provider_base_url: freshdeskBaseUrlFromDomain(normalized),
    source,
  };
}

function hostFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    if (!parsed.hostname) return null;
    return normalizeFreshdeskDomain(parsed.hostname);
  } catch {
    return null;
  }
}

export function extractFreshdeskAccountIdentity(
  headers: Headers | { get(name: string): string | null },
  body: unknown,
  webhookSearchParams?: URLSearchParams | null
): FreshdeskAccountIdentity | null {
  const headerDomain = asNonEmptyString(headers.get(FRESHDESK_DOMAIN_HEADER));
  if (headerDomain) {
    return identityFromDomain(headerDomain, FRESHDESK_DOMAIN_HEADER);
  }

  const queryDomain = asNonEmptyString(
    webhookSearchParams?.get(FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM) ?? null
  );
  if (queryDomain) {
    return identityFromDomain(queryDomain, `webhook_url.${FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM}`);
  }

  const bodyRecord =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  const domainCandidate =
    asNonEmptyString(bodyRecord?.domain) ??
    asNonEmptyString(bodyRecord?.account_domain) ??
    asNonEmptyString(bodyRecord?.freshdesk_domain);

  if (domainCandidate) {
    return identityFromDomain(domainCandidate, 'payload.domain');
  }

  const uri = asNonEmptyString(bodyRecord?.uri) ?? asNonEmptyString(bodyRecord?.ticket_url);
  if (uri) {
    const host = hostFromUri(uri);
    if (host && host.includes('freshdesk.com')) {
      return identityFromDomain(host, 'payload.uri');
    }
  }

  return null;
}
