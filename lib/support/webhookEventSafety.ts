import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claimProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import type { SupportIngestSuccess } from '@/lib/support/intake/ingestSupportCase';

const UPDATED_TIMESTAMP_FIELDS = [
  'updated_at',
  'updated_datetime',
  'last_updated_at',
  'created_at',
  'created_datetime',
] as const;

function ticketVersion(ticket: Record<string, unknown>): number | null {
  for (const field of UPDATED_TIMESTAMP_FIELDS) {
    const value = ticket[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/**
 * Claim a hydrated helpdesk snapshot. Hydration is intentional: some provider
 * automations deliver only a ticket id/URI, so the provider timestamp needed
 * for ordering exists only on the authenticated follow-up fetch.
 */
export async function claimSupportTicketDelivery(
  client: SupabaseClient,
  input: {
    provider: 'gorgias' | 'freshdesk' | 'zendesk';
    merchantId: string;
    providerConnectionId: string | null;
    eventType: string;
    ticket: Record<string, unknown>;
  },
) {
  const ticketId = String(input.ticket.id ?? '').trim();
  if (!ticketId) throw new Error('support_webhook_ticket_id_missing');
  const snapshot = JSON.stringify(input.ticket);
  const version = ticketVersion(input.ticket);
  const snapshotId = version == null
    ? createHash('sha256').update(snapshot).digest('hex')
    : String(version);

  return claimProcessedWebhook(client, {
    platform: input.provider,
    storeKey: `${input.merchantId}:${input.providerConnectionId ?? 'merchant'}`,
    nativeWebhookId: `${input.eventType}:${ticketId}:${snapshotId}`,
    topic: input.eventType,
    rawBody: snapshot,
    objectKey: version == null ? null : `ticket:${ticketId}`,
    eventVersion: version,
  });
}

export function replayedSupportResult(value: unknown): SupportIngestSuccess | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Partial<SupportIngestSuccess>;
  if (result.ok !== true || typeof result.merchant_id !== 'string' || typeof result.external_case_id !== 'string') {
    return null;
  }
  return result as SupportIngestSuccess;
}
