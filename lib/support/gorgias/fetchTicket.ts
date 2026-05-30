import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
} from '@/lib/support/gorgias/registerSidebarWidget';
import type { GorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';

export async function fetchGorgiasTicketById(input: {
  providerBaseUrl: string;
  credentials: GorgiasApiCredentials;
  ticketId: string;
}): Promise<Record<string, unknown>> {
  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  const id = input.ticketId.trim();
  return gorgiasApiRequest<Record<string, unknown>>(
    apiBaseUrl,
    `/tickets/${encodeURIComponent(id)}`,
    input.credentials,
    { method: 'GET' }
  );
}
