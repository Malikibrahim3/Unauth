import { env } from '@/lib/utils/env';

export const GORGIAS_WIDGET_TOKEN_HEADER = 'x-widget-token';

export type GorgiasSidebarRegistrationResult = {
  integrationId: number;
  widgetId: number;
};

export class GorgiasSidebarRegistrationError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'GorgiasSidebarRegistrationError';
    this.status = status;
    this.detail = detail;
  }
}

export function gorgiasApiBaseUrl(providerBaseUrl: string): string {
  const normalized = providerBaseUrl.replace(/\/$/, '');
  return `${normalized}/api`;
}

/** Busts Gorgias HTTP-integration response cache when the deploy changes. */
export function gorgiasWidgetUrlCacheBust(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';
}

/** Appends or replaces `_cb` without encoding `{{ticket.customer.email}}`. */
export function withWidgetUrlCacheBust(url: string, bust: string = gorgiasWidgetUrlCacheBust()): string {
  const withoutCb = url.replace(/([?&])_cb=[^&]*/g, '$1').replace(/[?&]$/, '');
  const separator = withoutCb.includes('?') ? '&' : '?';
  return `${withoutCb}${separator}_cb=${encodeURIComponent(bust)}`;
}

export function buildGorgiasWidgetIntegrationUrl(appBaseUrl: string, widgetToken: string): string {
  const base = appBaseUrl.replace(/\/$/, '');
  // The email param must stay the literal Gorgias placeholder `{{ticket.customer.email}}` so
  // Gorgias substitutes the real email at trigger time. URLSearchParams would percent-encode the
  // braces (%7B%7B…), which Gorgias never matches — so build the query string by hand and only
  // encode the token.
  // Use ticket.customer.email for URL interpolation compatibility in Gorgias HTTP integrations.
  // The widget route still falls back to ticket API resolution when this email is unusable.
  const url =
    `${base}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}` +
    `&email={{ticket.customer.email}}&customer_email={{ticket.customer.email}}&ticket_id={{ticket.id}}`;
  return withWidgetUrlCacheBust(url);
}

/**
 * Updates the HTTP integration URL in Gorgias (same widget + token). Forces Gorgias to
 * refetch widget JSON instead of serving a cached response from an older deploy.
 */
export async function refreshGorgiasSidebarWidgetIntegrationUrl(input: {
  providerBaseUrl: string;
  credentials: { email: string; api_key: string };
  integrationId: number;
}): Promise<void> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  const current = await gorgiasApiRequest<{ http?: { url?: string | null } }>(
    apiBaseUrl,
    `/integrations/${input.integrationId}`,
    input.credentials,
    { method: 'GET' }
  );
  const currentUrl = current.http?.url?.trim();
  if (!currentUrl) {
    throw new GorgiasSidebarRegistrationError(
      'gorgias_sidebar_integration_missing_url',
      404,
      'Integration has no http.url'
    );
  }

  const tokenMatch = currentUrl.match(/[?&]widget_token=([^&]+)/);
  const widgetToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  const rebuiltUrl = widgetToken
    ? buildGorgiasWidgetIntegrationUrl(env.NEXT_PUBLIC_APP_URL, widgetToken)
    : withWidgetUrlCacheBust(currentUrl);
  const nextUrl = rebuiltUrl;
  if (nextUrl === currentUrl) {
    return;
  }

  await gorgiasApiRequest<GorgiasIntegrationResponse>(
    apiBaseUrl,
    `/integrations/${input.integrationId}`,
    input.credentials,
    {
      method: 'PUT',
      body: JSON.stringify({ http: { url: nextUrl } }),
    }
  );
}

export async function refreshGorgiasSidebarWidgetTemplate(input: {
  providerBaseUrl: string;
  credentials: { email: string; api_key: string };
  widgetId: number;
}): Promise<void> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  await gorgiasApiRequest<GorgiasWidgetResponse>(
    apiBaseUrl,
    `/widgets/${input.widgetId}`,
    input.credentials,
    {
      method: 'PUT',
      body: JSON.stringify({
        context: 'ticket',
        type: 'http',
        template: buildGorgiasSidebarWidgetTemplate(env.NEXT_PUBLIC_APP_URL),
      }),
    }
  );
}

/** Gorgias sidebar card title — shown to agents in the helpdesk. */
export const GORGIAS_SIDEBAR_CARD_TITLE = 'Unauth claim context';

/** Row labels in buildGorgiasSidebarWidgetTemplate (must align with widget JSON field paths). */
export const GORGIAS_SIDEBAR_ROW_LABELS = {
  identity: 'Case context',
  claims: 'Store Check',
  orders: 'Network Check',
  claim_rate: 'Case Report',
  primary_reason: 'Store context',
  recent_activity: 'Network context',
  ce3_evidence: 'Review note',
  watchlisted: 'Data safety',
} as const;

export function buildGorgiasSidebarWidgetTemplate(appBaseUrl: string) {
  const appLink = appBaseUrl.replace(/\/$/, '');
  const fallbackConnectLink = `${appLink}/settings/integrations/gorgias`;
  const ctaUrl = '{{cta_url}}';
  const ctaLabel = '{{cta_label}}';
  const labels = GORGIAS_SIDEBAR_ROW_LABELS;
  // HTTP integration returns flat JSON at the root; child paths resolve against that object.
  // Empty card path = root (see Gorgias programmatic widgets docs).
  return {
    type: 'wrapper',
    widgets: [
      {
        type: 'card',
        title: GORGIAS_SIDEBAR_CARD_TITLE,
        path: '',
        meta: {
          displayCard: true,
          link: fallbackConnectLink,
          custom: {
            links: [
              { url: '{{basic_unlock_url}}', label: '{{basic_unlock_label}}' },
              { url: '{{full_unlock_url}}', label: '{{full_unlock_label}}' },
              { url: '{{evidence_unlock_url}}', label: '{{evidence_unlock_label}}' },
              { url: ctaUrl, label: ctaLabel },
            ],
          },
        },
        widgets: [
          { path: 'identity', title: labels.identity, type: 'text' },
          { path: 'claims', title: labels.claims, type: 'text' },
          { path: 'orders', title: labels.orders, type: 'text' },
          { path: 'claim_rate', title: labels.claim_rate, type: 'text' },
          { path: 'primary_reason', title: labels.primary_reason, type: 'text' },
          { path: 'recent_activity', title: labels.recent_activity, type: 'text' },
          { path: 'ce3_evidence', title: labels.ce3_evidence, type: 'text' },
          { path: 'watchlisted', title: labels.watchlisted, type: 'text' },
        ],
      },
    ],
  };
}

export function basicAuthHeader(email: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${email}:${apiKey}`, 'utf8').toString('base64')}`;
}

function retryAfterMs(value: string | null): number | null {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseGorgiasErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return `HTTP ${res.status}`;
  try {
    const body = JSON.parse(text) as { error?: { msg?: string } | string; message?: string };
    if (typeof body.error === 'string') return body.error;
    if (body.error && typeof body.error === 'object' && typeof body.error.msg === 'string') {
      return body.error.msg;
    }
    if (typeof body.message === 'string') return body.message;
  } catch {
    // fall through
  }
  return text.slice(0, 500);
}

export async function gorgiasApiRequest<T>(
  apiBaseUrl: string,
  path: string,
  credentials: { email: string; api_key: string },
  init: RequestInit
): Promise<T> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(credentials.email, credentials.api_key),
        ...(init.headers ?? {}),
      },
    });

    if (res.status !== 429 || attempt === 2) break;
    await sleep(retryAfterMs(res.headers.get('retry-after')) ?? 2 ** attempt * 500);
  }

  if (!res) {
    throw new GorgiasSidebarRegistrationError(
      'gorgias_sidebar_registration_failed',
      0,
      'request_failed'
    );
  }

  if (!res.ok) {
    const detail = await parseGorgiasErrorResponse(res);
    throw new GorgiasSidebarRegistrationError(
      'gorgias_sidebar_registration_failed',
      res.status,
      detail
    );
  }

  return (await res.json()) as T;
}

type GorgiasIntegrationResponse = {
  id: number;
};

type GorgiasWidgetResponse = {
  id: number;
};

/**
 * Deletes a previously-registered widget + integration. Best-effort: a 404 (already
 * gone) is treated as success, and any other failure is swallowed so it can never
 * abort a successful re-registration. The widget is deleted before its integration
 * because the widget references the integration.
 */
export async function deleteGorgiasSidebarWidget(
  apiBaseUrl: string,
  credentials: { email: string; api_key: string },
  previous: { integrationId: number; widgetId: number }
): Promise<void> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const deletions: Array<{ path: string }> = [
    { path: `/widgets/${previous.widgetId}` },
    { path: `/integrations/${previous.integrationId}` },
  ];

  await Promise.all(
    deletions.map(async ({ path: deletePath }) => {
      try {
        const res = await fetch(`${base}${deletePath}`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: basicAuthHeader(credentials.email, credentials.api_key),
          },
        });
        // 404 = already deleted; any non-OK is swallowed (best-effort cleanup).
        if (!res.ok && res.status !== 404) {
          await res.text().catch(() => '');
        }
      } catch {
        // Network/other error — leave the stale resource rather than fail the reconnect.
      }
    })
  );
}

export async function registerGorgiasSidebarWidget(input: {
  providerBaseUrl: string;
  credentials: { email: string; api_key: string };
  widgetToken: string;
  /** Previously-registered integration+widget to remove after the new one is live. */
  previous?: { integrationId: number; widgetId: number } | null;
}): Promise<GorgiasSidebarRegistrationResult> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  const appBaseUrl = env.NEXT_PUBLIC_APP_URL;
  const widgetUrl = buildGorgiasWidgetIntegrationUrl(appBaseUrl, input.widgetToken);

  const integration = await gorgiasApiRequest<GorgiasIntegrationResponse>(
    apiBaseUrl,
    '/integrations',
    input.credentials,
    {
      method: 'POST',
      body: JSON.stringify({
        name: GORGIAS_SIDEBAR_CARD_TITLE,
        description: 'Unauth case context for Gorgias support tickets (credit unlock)',
        type: 'http',
        http: {
          url: widgetUrl,
          method: 'GET',
          headers: {
            [GORGIAS_WIDGET_TOKEN_HEADER]: input.widgetToken,
          },
          triggers: {
            'ticket-created': true,
            'ticket-updated': true,
            'ticket-message-created': true,
          },
          request_content_type: 'application/json',
          response_content_type: 'application/json',
        },
      }),
    }
  );

  const widget = await gorgiasApiRequest<GorgiasWidgetResponse>(
    apiBaseUrl,
    '/widgets',
    input.credentials,
    {
      method: 'POST',
      body: JSON.stringify({
        context: 'ticket',
        type: 'http',
        integration_id: integration.id,
        template: buildGorgiasSidebarWidgetTemplate(appBaseUrl),
      }),
    }
  );

  // New widget is live — now remove the previous one so the merchant doesn't end up
  // with two Unauth sidebar cards. Best-effort; never aborts on failure.
  if (input.previous) {
    await deleteGorgiasSidebarWidget(apiBaseUrl, input.credentials, input.previous);
  }

  return {
    integrationId: integration.id,
    widgetId: widget.id,
  };
}
