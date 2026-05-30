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

export function buildGorgiasWidgetIntegrationUrl(appBaseUrl: string, widgetToken: string): string {
  const base = appBaseUrl.replace(/\/$/, '');
  // The email param must stay the literal Gorgias placeholder `{{ticket.customer.email}}` so
  // Gorgias substitutes the real email at trigger time. URLSearchParams would percent-encode the
  // braces (%7B%7B…), which Gorgias never matches — so build the query string by hand and only
  // encode the token.
  return `${base}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}&email={{ticket.customer.email}}`;
}

export function buildGorgiasSidebarWidgetTemplate(appBaseUrl: string) {
  const appLink = appBaseUrl.replace(/\/$/, '');
  // HTTP integration returns flat JSON at the root; child paths (risk_level, etc.) resolve
  // against that object. Empty card path = root (see Gorgias programmatic widgets docs).
  return {
    type: 'wrapper',
    widgets: [
      {
        type: 'card',
        title: 'Unauth Fraud Intelligence',
        path: '',
        meta: {
          displayCard: true,
          link: appLink,
          custom: {
            links: [{ url: appLink, label: 'View full profile in Unauth' }],
          },
        },
        widgets: [
          { path: 'risk_level', title: 'Risk level', type: 'text' },
          { path: 'risk_score', title: 'Risk score', type: 'text' },
          { path: 'cross_merchant', title: 'Cross-merchant', type: 'text' },
          { path: 'fraud_flags', title: 'Fraud flags', type: 'text' },
        ],
      },
    ],
  };
}

function basicAuthHeader(email: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${email}:${apiKey}`, 'utf8').toString('base64')}`;
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

async function gorgiasApiRequest<T>(
  apiBaseUrl: string,
  path: string,
  credentials: { email: string; api_key: string },
  init: RequestInit
): Promise<T> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(credentials.email, credentials.api_key),
      ...(init.headers ?? {}),
    },
  });

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
async function deleteGorgiasSidebarWidget(
  apiBaseUrl: string,
  credentials: { email: string; api_key: string },
  previous: { integrationId: number; widgetId: number }
): Promise<void> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const deletions: Array<{ path: string }> = [
    { path: `/widgets/${previous.widgetId}` },
    { path: `/integrations/${previous.integrationId}` },
  ];

  for (const { path } of deletions) {
    try {
      const res = await fetch(`${base}${path}`, {
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
  }
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
        name: 'Unauth Fraud Intelligence',
        description: 'Unauth fraud intelligence for Gorgias support tickets',
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
  // with two "Unauth Fraud Intelligence" cards. Best-effort; never aborts on failure.
  if (input.previous) {
    await deleteGorgiasSidebarWidget(apiBaseUrl, input.credentials, input.previous);
  }

  return {
    integrationId: integration.id,
    widgetId: widget.id,
  };
}
