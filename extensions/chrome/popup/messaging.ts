import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';

export function sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse | undefined) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          error: chrome.runtime.lastError.message ?? 'Extension error',
          code: 'network',
        });
        return;
      }
      resolve(response ?? { ok: false, error: 'No response from extension', code: 'unknown' });
    });
  });
}

export function errorMessage(code: number | string | undefined, fallback: string): string {
  if (code === 401) {
    return 'Invalid API key. Check Settings → API & Integrations in Unauth.';
  }
  if (code === 404) {
    return 'No profile found for this email.';
  }
  if (code === 429) {
    return 'Daily lookup limit reached. Try again after 00:00 UTC.';
  }
  if (code === 'network') {
    return 'Could not reach Unauth. Check your connection.';
  }
  return fallback;
}
