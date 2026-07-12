import { ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM } from '@/lib/support/zendesk/supportConnectionShared';
import { normalizeZendeskSubdomain } from '@/lib/support/zendesk/accountIdentity';

export const ZENDESK_SUBDOMAIN_HEADER = 'x-zendesk-subdomain';

export type ZendeskAccountIdentity = {
  subdomain: string | null;
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

function identityFromSubdomain(subdomain: string, source: string): ZendeskAccountIdentity | null {
  try {
    return { subdomain: normalizeZendeskSubdomain(subdomain), source };
  } catch {
    return null;
  }
}

function hostFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Extract the Zendesk account (subdomain) identity from a webhook request.
 *
 * Zendesk's trigger/webhook UI does not reliably support custom headers on every
 * plan, so the registered webhook URL always carries the subdomain as a query
 * param (`zendesk_subdomain`) as the primary transport. Headers and payload
 * fields (ticket.url, via.source.from.address host) are best-effort fallbacks.
 */
export function extractZendeskAccountIdentity(
  headers: Headers | { get(name: string): string | null },
  body: unknown,
  ticket: Record<string, unknown>,
  webhookSearchParams?: URLSearchParams | null
): ZendeskAccountIdentity | null {
  const headerSubdomain = asNonEmptyString(headers.get(ZENDESK_SUBDOMAIN_HEADER));
  if (headerSubdomain) {
    const identity = identityFromSubdomain(headerSubdomain, ZENDESK_SUBDOMAIN_HEADER);
    if (identity) return identity;
  }

  const querySubdomain = asNonEmptyString(
    webhookSearchParams?.get(ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM) ?? null
  );
  if (querySubdomain) {
    const identity = identityFromSubdomain(
      querySubdomain,
      `webhook_url.${ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM}`
    );
    if (identity) return identity;
  }

  const bodyRecord =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  const candidates: Array<{ value: string | null; source: string }> = [
    { value: asNonEmptyString(bodyRecord?.subdomain), source: 'payload.subdomain' },
    { value: asNonEmptyString(readPath(bodyRecord, ['account', 'subdomain'])), source: 'payload.account.subdomain' },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) continue;
    const identity = identityFromSubdomain(candidate.value, candidate.source);
    if (identity) return identity;
  }

  const uriCandidates = [
    asNonEmptyString(bodyRecord?.url),
    asNonEmptyString(ticket.url),
    asNonEmptyString(ticket.external_url),
  ];
  for (const uri of uriCandidates) {
    if (!uri) continue;
    const host = hostFromUri(uri);
    if (host && host.endsWith('.zendesk.com')) {
      const identity = identityFromSubdomain(host, 'payload.ticket_url');
      if (identity) return identity;
    }
  }

  return null;
}
