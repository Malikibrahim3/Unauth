import {
  GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM,
} from '@/lib/support/gorgias/supportConnectionShared';

export const GORGIAS_ACCOUNT_ID_HEADER = 'x-gorgias-account-id';
export const GORGIAS_DOMAIN_HEADER = 'x-gorgias-domain';

export type GorgiasAccountIdentity = {
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

function readPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function normalizeGorgiasDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.split('/')[0] ?? normalized;
  return normalized.replace(/\.$/, '');
}

export function gorgiasBaseUrlFromDomain(domain: string): string {
  return `https://${normalizeGorgiasDomain(domain)}`;
}

export function normalizeGorgiasBaseUrl(url: string): string {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return `https://${parsed.hostname.toLowerCase()}`;
  } catch {
    return gorgiasBaseUrlFromDomain(url);
  }
}

function hostFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    if (!parsed.hostname) return null;
    return normalizeGorgiasDomain(parsed.hostname);
  } catch {
    return null;
  }
}

function identityFromDomain(domain: string, source: string): GorgiasAccountIdentity {
  const normalized = normalizeGorgiasDomain(domain);
  return {
    provider_account_id: null,
    domain: normalized,
    provider_base_url: gorgiasBaseUrlFromDomain(normalized),
    source,
  };
}

function identityFromAccountId(accountId: string, source: string): GorgiasAccountIdentity {
  return {
    provider_account_id: accountId,
    domain: null,
    provider_base_url: null,
    source,
  };
}

export function extractGorgiasAccountIdentity(
  headers: Headers | { get(name: string): string | null },
  body: unknown,
  ticket: Record<string, unknown>,
  webhookSearchParams?: URLSearchParams | null
): GorgiasAccountIdentity | null {
  const headerAccountId = asNonEmptyString(headers.get(GORGIAS_ACCOUNT_ID_HEADER));
  if (headerAccountId) {
    return identityFromAccountId(headerAccountId, GORGIAS_ACCOUNT_ID_HEADER);
  }

  const headerDomain = asNonEmptyString(headers.get(GORGIAS_DOMAIN_HEADER));
  if (headerDomain) {
    return identityFromDomain(headerDomain, GORGIAS_DOMAIN_HEADER);
  }

  const queryDomain = asNonEmptyString(
    webhookSearchParams?.get(GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM) ?? null
  );
  if (queryDomain) {
    return identityFromDomain(
      queryDomain,
      `webhook_url.${GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM}`
    );
  }

  const bodyRecord =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  const candidates: Array<{ value: string | null; source: string; kind: 'id' | 'domain' | 'uri' }> = [
    { value: asNonEmptyString(bodyRecord?.account_id), source: 'payload.account_id', kind: 'id' },
    {
      value: asNonEmptyString(readPath(bodyRecord, ['account', 'id'])),
      source: 'payload.account.id',
      kind: 'id',
    },
    { value: asNonEmptyString(bodyRecord?.domain), source: 'payload.domain', kind: 'domain' },
    {
      value: asNonEmptyString(readPath(bodyRecord, ['account', 'domain'])),
      source: 'payload.account.domain',
      kind: 'domain',
    },
    { value: asNonEmptyString(bodyRecord?.uri), source: 'payload.uri', kind: 'uri' },
    { value: asNonEmptyString(ticket.uri), source: 'ticket.uri', kind: 'uri' },
    {
      value: asNonEmptyString(ticket.external_url),
      source: 'ticket.external_url',
      kind: 'uri',
    },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) continue;
    if (candidate.kind === 'id') {
      return identityFromAccountId(candidate.value, candidate.source);
    }
    if (candidate.kind === 'domain') {
      return identityFromDomain(candidate.value, candidate.source);
    }
    const host = hostFromUri(candidate.value);
    if (host && host.includes('gorgias')) {
      return identityFromDomain(host, candidate.source);
    }
  }

  return null;
}
