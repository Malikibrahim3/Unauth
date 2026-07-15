import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
} from '@/lib/support/gorgias/registerSidebarWidget';
import type { GorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';

const DEFAULT_THROTTLE_MS = 45_000;
const RECENT_TICKET_LIMIT = 50;

type TicketMeta = Record<string, unknown>;

type TicketForRefresh = {
  meta?: unknown;
};

type SupportCaseRow = {
  external_id?: string | number | null;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function gorgiasWidgetPayloadHash(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function readMeta(value: unknown): TicketMeta {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as TicketMeta) }
    : {};
}

function shouldNudgeTicket(input: {
  meta: TicketMeta;
  payloadHash: string;
  nowMs: number;
  throttleMs: number;
}): boolean {
  const existingHash =
    typeof input.meta.unauth_widget_payload_hash === 'string'
      ? input.meta.unauth_widget_payload_hash
      : null;
  const lastRefresh =
    typeof input.meta.unauth_widget_refresh_at === 'string'
      ? Date.parse(input.meta.unauth_widget_refresh_at)
      : NaN;

  if (existingHash === input.payloadHash) return false;
  if (Number.isFinite(lastRefresh) && input.nowMs - lastRefresh < input.throttleMs) return false;
  return true;
}

export async function nudgeGorgiasTicketWidgetRefresh(input: {
  providerBaseUrl: string;
  credentials: GorgiasApiCredentials;
  ticketId: string;
  reason: string;
  payload?: unknown;
  throttleMs?: number;
}): Promise<{ nudged: boolean; reason: 'updated' | 'throttled_or_unchanged' | 'missing_ticket_id' }> {
  const ticketId = input.ticketId.trim();
  if (!ticketId) return { nudged: false, reason: 'missing_ticket_id' };

  const apiBaseUrl = gorgiasApiBaseUrl(input.providerBaseUrl);
  const now = new Date();
  const nowMs = now.getTime();
  const payloadHash = gorgiasWidgetPayloadHash(input.payload ?? { reason: input.reason });
  const ticket = await gorgiasApiRequest<TicketForRefresh>(
    apiBaseUrl,
    `/tickets/${encodeURIComponent(ticketId)}`,
    input.credentials,
    { method: 'GET' }
  );
  const meta = readMeta(ticket.meta);

  if (
    !shouldNudgeTicket({
      meta,
      payloadHash,
      nowMs,
      throttleMs: input.throttleMs ?? DEFAULT_THROTTLE_MS,
    })
  ) {
    return { nudged: false, reason: 'throttled_or_unchanged' };
  }

  await gorgiasApiRequest<Record<string, unknown>>(
    apiBaseUrl,
    `/tickets/${encodeURIComponent(ticketId)}`,
    input.credentials,
    {
      method: 'PUT',
      body: JSON.stringify({
        meta: {
          ...meta,
          unauth_widget_payload_hash: payloadHash,
          unauth_widget_refresh_at: now.toISOString(),
          unauth_widget_refresh_reason: input.reason,
        },
      }),
    }
  );

  return { nudged: true, reason: 'updated' };
}

export async function nudgeGorgiasTicketWidgetRefreshBestEffort(input: {
  providerBaseUrl: string;
  credentials: GorgiasApiCredentials;
  ticketId: string;
  reason: string;
  payload?: unknown;
  throttleMs?: number;
}): Promise<void> {
  try {
    await nudgeGorgiasTicketWidgetRefresh(input);
  } catch {
    // Widget refreshes are helpful but must never block ticket ingestion or rendering.
  }
}

export async function nudgeRecentGorgiasTicketsForMerchantBestEffort(input: {
  supabase: SupabaseClient;
  merchantId: string;
  reason: string;
  payload?: unknown;
  limit?: number;
}): Promise<void> {
  try {
    const access = await getActiveGorgiasMerchantApiAccess(input.supabase, input.merchantId);
    if (!access) return;
    await nudgeRecentGorgiasTicketsWithAccessBestEffort({
      ...input,
      access,
    });
  } catch {
    // Best-effort batch refresh.
  }
}

export async function nudgeRecentGorgiasTicketsWithAccessBestEffort(input: {
  supabase: SupabaseClient;
  merchantId: string;
  access: { providerBaseUrl: string; credentials: GorgiasApiCredentials };
  reason: string;
  payload?: unknown;
  limit?: number;
}): Promise<void> {
  try {
    const { data, error } = await input.supabase
      .from(TABLES.SUPPORT_CASE_INTAKE)
      .select('external_id')
      .eq('merchant_id', input.merchantId)
      .eq('provider', 'gorgias')
      .order('updated_at_provider', { ascending: false })
      .limit(input.limit ?? RECENT_TICKET_LIMIT);

    if (error || !Array.isArray(data)) return;

    const ticketIds = Array.from(
      new Set(
        (data as SupportCaseRow[])
          .map((row) => (row.external_id == null ? '' : String(row.external_id).trim()))
          .filter(Boolean)
      )
    );

    await Promise.all(
      ticketIds.map((ticketId) =>
        nudgeGorgiasTicketWidgetRefreshBestEffort({
          ...input.access,
          ticketId,
          reason: input.reason,
          payload: input.payload,
        })
      )
    );
  } catch {
    // Best-effort batch refresh.
  }
}
