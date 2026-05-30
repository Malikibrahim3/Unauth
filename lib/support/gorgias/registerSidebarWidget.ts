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
        },
        widgets: [
          { path: 'risk_level', title: 'Risk level', type: 'text' },
          { path: 'identity_confidence_grade', title: 'Confidence', type: 'text' },
          { path: 'match_score', title: 'Match score', type: 'text' },
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

export async function registerGorgiasSidebarWidget(input: {
  providerBaseUrl: string;
  credentials: { email: string; api_key: string };
  widgetToken: string;
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

  return {
    integrationId: integration.id,
    widgetId: widget.id,
  };
}
