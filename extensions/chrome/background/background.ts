import { API_BASE } from '../shared/types';
import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import type { EvidenceResponse, LookupResponse } from '../shared/types';

const STORAGE_KEYS = {
  apiKey: 'apiKey',
  badgeDismissed: 'badgeDismissed',
  pendingEmail: 'pendingEmail',
  detectedEmail: 'detectedEmail',
} as const;

async function getApiKey(): Promise<string | null> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.apiKey);
  const key = data[STORAGE_KEYS.apiKey];
  return typeof key === 'string' && key.length > 0 ? key : null;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { ok: false, status: 401, error: 'API key not configured' };
  }

  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof body?.error === 'string'
          ? body.error
          : `Request failed (${response.status})`;
      return { ok: false, status: response.status, error: message };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'Network error' };
  }
}

async function lookupCustomer(params: {
  email: string;
  name?: string;
  address?: string;
}): Promise<ExtensionResponse> {
  const search = new URLSearchParams({ email: params.email });
  if (params.name?.trim()) search.set('name', params.name.trim());
  if (params.address?.trim()) search.set('address', params.address.trim());

  const result = await apiFetch<LookupResponse>(`/api/v1/lookup?${search.toString()}`);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      code: result.status === 0 ? 'network' : (result.status as 401 | 404 | 429),
    };
  }
  const profileLink = await apiFetch<{ profile_url: string }>('/api/v1/profile-link', {
    method: 'POST',
    body: JSON.stringify({ email: params.email }),
  });
  return {
    ok: true,
    lookup: result.data,
    profileUrl: profileLink.ok ? profileLink.data.profile_url : undefined,
  };
}

async function createEvidence(params: {
  email: string;
  orderId: string;
  disputedAmount?: number;
  currency?: string;
}): Promise<ExtensionResponse> {
  const result = await apiFetch<EvidenceResponse>('/api/v1/evidence', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      order_id: params.orderId,
      ...(params.disputedAmount != null ? { disputed_amount: params.disputedAmount } : {}),
      ...(params.currency ? { currency: params.currency } : {}),
    }),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      code: result.status === 0 ? 'network' : (result.status as 401 | 404 | 429),
    };
  }
  const evidenceId = result.data.evidence_id;
  if (!evidenceId) return { ok: true, evidence: result.data };

  const signedUrl = await apiFetch<{ download_url: string }>(
    `/api/v1/evidence/${encodeURIComponent(evidenceId)}/signed-url`,
    { method: 'POST' },
  );
  return {
    ok: true,
    evidence: {
      ...result.data,
      download_url: signedUrl.ok ? signedUrl.data.download_url : result.data.download_url,
    },
  };
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (r: ExtensionResponse) => void) => {
    void (async () => {
      switch (message.type) {
        case 'GET_STATE': {
          const data = await chrome.storage.local.get([
            STORAGE_KEYS.apiKey,
            STORAGE_KEYS.badgeDismissed,
            STORAGE_KEYS.pendingEmail,
            STORAGE_KEYS.detectedEmail,
          ]);
          sendResponse({
            ok: true,
            apiKey: (data[STORAGE_KEYS.apiKey] as string | undefined) ?? null,
            badgeDismissed: Boolean(data[STORAGE_KEYS.badgeDismissed]),
            pendingEmail: (data[STORAGE_KEYS.pendingEmail] as string | undefined) ?? null,
            detectedEmail: (data[STORAGE_KEYS.detectedEmail] as string | undefined) ?? null,
          });
          return;
        }
        case 'SAVE_API_KEY': {
          const trimmed = message.apiKey.trim();
          if (!trimmed.startsWith('unauth_sk_')) {
            sendResponse({ ok: false, error: 'API key must start with unauth_sk_' });
            return;
          }
          await chrome.storage.local.set({ [STORAGE_KEYS.apiKey]: trimmed });
          sendResponse({ ok: true });
          return;
        }
        case 'CLEAR_API_KEY': {
          await chrome.storage.local.remove([
            STORAGE_KEYS.apiKey,
            STORAGE_KEYS.pendingEmail,
            STORAGE_KEYS.detectedEmail,
          ]);
          sendResponse({ ok: true, apiKey: null });
          return;
        }
        case 'SET_BADGE_DISMISSED': {
          await chrome.storage.local.set({
            [STORAGE_KEYS.badgeDismissed]: message.dismissed,
          });
          sendResponse({ ok: true, badgeDismissed: message.dismissed });
          return;
        }
        case 'EMAIL_DETECTED': {
          await chrome.storage.local.set({
            [STORAGE_KEYS.detectedEmail]: message.email,
          });
          sendResponse({ ok: true });
          return;
        }
        case 'OPEN_POPUP': {
          if (message.email) {
            await chrome.storage.local.set({
              [STORAGE_KEYS.pendingEmail]: message.email,
            });
          }
          try {
            await chrome.action.openPopup();
          } catch {
            // openPopup may fail outside a user gesture — email still stored
          }
          sendResponse({ ok: true });
          return;
        }
        case 'GET_DETECTED_EMAIL': {
          const data = await chrome.storage.local.get([
            STORAGE_KEYS.pendingEmail,
            STORAGE_KEYS.detectedEmail,
          ]);
          const email =
            (data[STORAGE_KEYS.pendingEmail] as string | undefined) ??
            (data[STORAGE_KEYS.detectedEmail] as string | undefined) ??
            null;
          if (data[STORAGE_KEYS.pendingEmail]) {
            await chrome.storage.local.remove(STORAGE_KEYS.pendingEmail);
          }
          sendResponse({ ok: true, detectedEmail: email, pendingEmail: email });
          return;
        }
        case 'LOOKUP': {
          sendResponse(await lookupCustomer(message));
          return;
        }
        case 'CREATE_EVIDENCE': {
          sendResponse(await createEvidence(message));
          return;
        }
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    })();
    return true;
  }
);
