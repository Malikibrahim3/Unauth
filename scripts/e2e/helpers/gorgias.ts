/**
 * Gorgias REST API helpers for the E2E suite. Real API calls only.
 *
 * Auth is HTTP Basic (email:api_token base64) — the same scheme the production
 * code uses (basicAuthHeader). Base URL is GORGIAS_BASE_URL + '/api'.
 *
 * Note on determinism: macros applied here are best-effort. The webhook payload
 * the scenarios POST embeds the macro/order data explicitly, so ingestion is
 * deterministic regardless of how Gorgias serialises its own ticket.
 */
import { gorgiasBaseUrl, requireVar } from './envVars';

function apiBase(): string {
  return `${gorgiasBaseUrl()}/api`;
}

function authHeader(): string {
  const email = requireVar('GORGIAS_API_EMAIL');
  const token = requireVar('GORGIAS_API_TOKEN');
  return `Basic ${Buffer.from(`${email}:${token}`, 'utf8').toString('base64')}`;
}

async function gorgiasRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gorgias ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type GorgiasTicket = { id: number; subject: string | null; status: string | null };
export type GorgiasIntegration = {
  id: number;
  name: string | null;
  type: string | null;
  http?: { url?: string; method?: string } | null;
};

function customerEmail(): string {
  return requireVar('GORGIAS_API_EMAIL');
}

/** Connectivity probe: GET /api/account → returns the account record. */
export async function getAccount(): Promise<Record<string, unknown>> {
  return gorgiasRequest<Record<string, unknown>>('GET', '/account');
}

export async function createTicket(
  customerEmailAddr: string,
  subject: string,
  body: string,
  tags: string[] = []
): Promise<GorgiasTicket> {
  const payload = {
    subject,
    channel: 'email',
    via: 'email',
    status: 'open',
    customer: { email: customerEmailAddr },
    tags: tags.map((name) => ({ name })),
    messages: [
      {
        channel: 'email',
        via: 'email',
        from_agent: false,
        source: {
          type: 'email',
          from: { address: customerEmailAddr },
          to: [{ address: customerEmail() }],
        },
        sender: { email: customerEmailAddr },
        body_text: body,
        body_html: `<p>${body}</p>`,
      },
    ],
  };
  return gorgiasRequest<GorgiasTicket>('POST', '/tickets', payload);
}

export async function addMessage(ticketId: number, body: string): Promise<void> {
  await gorgiasRequest('POST', `/tickets/${ticketId}/messages`, {
    channel: 'email',
    via: 'email',
    from_agent: false,
    source: { type: 'email', from: { address: customerEmail() } },
    sender: { email: customerEmail() },
    body_text: body,
    body_html: `<p>${body}</p>`,
  });
}

/**
 * Best-effort macro application: look up the macro by name and apply it. The
 * webhook payload still embeds the macro name for deterministic outcome
 * inference, so a failure here only loses real-API fidelity, not correctness.
 */
export async function applyMacro(ticketId: number, macroName: string): Promise<boolean> {
  try {
    const list = await gorgiasRequest<{ data: Array<{ id: number; name: string }> }>(
      'GET',
      '/macros?limit=100'
    );
    const macro = (list.data ?? []).find(
      (m) => m.name?.trim().toLowerCase() === macroName.trim().toLowerCase()
    );
    if (!macro) return false;
    await gorgiasRequest('POST', `/tickets/${ticketId}/macros`, { macro_ids: [macro.id] });
    return true;
  } catch {
    return false;
  }
}

export async function deleteTicket(ticketId: number): Promise<void> {
  await gorgiasRequest('DELETE', `/tickets/${ticketId}`);
}

type IntegrationListResponse = {
  data: GorgiasIntegration[];
  meta?: { next_cursor?: string | null };
};

export async function listWebhookIntegrations(): Promise<GorgiasIntegration[]> {
  const out: GorgiasIntegration[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const path: string = cursor
      ? `/integrations?limit=100&cursor=${encodeURIComponent(cursor)}`
      : '/integrations?limit=100';
    const res: IntegrationListResponse = await gorgiasRequest<IntegrationListResponse>('GET', path);
    out.push(...(res.data ?? []));
    cursor = res.meta?.next_cursor ?? null;
    if (!cursor) break;
  }
  return out.filter((i) => (i.type ?? '').toLowerCase() === 'http');
}

export async function deleteIntegration(integrationId: number): Promise<void> {
  await gorgiasRequest('DELETE', `/integrations/${integrationId}`);
}

// ---------------------------------------------------------------------------
// Best-effort wrappers used by the cleanup registry (never throw).
// ---------------------------------------------------------------------------

export async function deleteGorgiasTicketBestEffort(ticketId: number): Promise<void> {
  try {
    await deleteTicket(ticketId);
  } catch {
    /* swallow — registry logs the id for manual cleanup */
  }
}

export async function deleteGorgiasIntegrationBestEffort(integrationId: number): Promise<void> {
  try {
    await deleteIntegration(integrationId);
  } catch {
    /* swallow */
  }
}
