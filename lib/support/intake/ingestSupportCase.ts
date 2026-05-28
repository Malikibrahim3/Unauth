import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { SUPPORT_PROVIDERS } from '@/lib/support/providers/types';
import {
  normalizeSupportTicket,
  toSupportCaseIntakeUpsertInput,
} from '@/lib/support/intake/normalizeTicket';
import {
  linkSupportCaseToCommerceContext,
  type SupportLinkStatus,
} from '@/lib/support/intake/linkSupportCase';
import { appendSupportCaseEvent, upsertSupportCaseIntake } from '@/lib/support/intake/store';

export const supportIngestBodySchema = z.object({
  merchant_id: z.string().uuid(),
  provider: z.enum(SUPPORT_PROVIDERS),
  provider_connection_id: z.string().uuid().optional(),
  shop_domain: z.string().min(1).optional(),
  event_type: z.string().min(1),
  raw: z.record(z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'raw payload must be a non-empty object',
  }),
});

export type SupportIngestBody = z.infer<typeof supportIngestBodySchema>;

export type SupportIngestSuccess = {
  ok: true;
  provider: string;
  support_case_id: string;
  event_id: string;
  external_case_id: string;
  order_ref: string | null;
  claim_reason: string | null;
  case_status: string | null;
  link_status: SupportLinkStatus;
  shopify_order_id: string | null;
  customer_profile_id: string | null;
  merchant_claim_id: string | null;
};

export class SupportIngestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'SupportIngestError';
  }
}

function buildEventSummary(eventType: string, externalCaseId: string): string {
  return truncateSafeText(`${eventType} (${externalCaseId})`, 200);
}

function truncateSafeText(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

async function assertProviderConnection(
  supabase: unknown,
  merchantId: string,
  providerConnectionId: string
): Promise<string | null> {
  const { data, error } = await (supabase as {
    from: (table: string) => {
      select: (columns?: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select('id, merchant_id, provider_base_url')
    .eq('id', providerConnectionId)
    .maybeSingle();

  if (error) {
    throw new SupportIngestError(500, 'provider_connection_lookup_failed');
  }

  if (!data) {
    throw new SupportIngestError(404, 'provider_connection_not_found');
  }

  if (data.merchant_id !== merchantId) {
    throw new SupportIngestError(403, 'provider_connection_merchant_mismatch');
  }

  return typeof data.provider_base_url === 'string' ? data.provider_base_url : null;
}

export async function ingestSupportCase(
  supabase: unknown,
  body: SupportIngestBody
): Promise<SupportIngestSuccess> {
  const parsed = supportIngestBodySchema.parse(body);
  const client = supabase as Parameters<typeof upsertSupportCaseIntake>[0] &
    Parameters<typeof appendSupportCaseEvent>[0];

  let providerBaseUrl: string | null = null;
  if (parsed.provider_connection_id) {
    providerBaseUrl = await assertProviderConnection(
      supabase,
      parsed.merchant_id,
      parsed.provider_connection_id
    );
  }

  const normalized = normalizeSupportTicket(parsed.provider, parsed.raw, {
    merchant_id: parsed.merchant_id,
    provider_connection_id: parsed.provider_connection_id ?? null,
    shop_domain: parsed.shop_domain ?? null,
    provider_base_url: providerBaseUrl,
  });

  const upsertInput = toSupportCaseIntakeUpsertInput(normalized) as Parameters<
    typeof upsertSupportCaseIntake
  >[1];
  const caseRow = await upsertSupportCaseIntake(client, upsertInput);
  if (!caseRow || typeof caseRow.id !== 'string') {
    throw new SupportIngestError(500, 'case_upsert_failed');
  }
  const supportCaseId = caseRow.id;

  const eventRow = await appendSupportCaseEvent(client, {
    merchant_id: parsed.merchant_id,
    support_case_id: supportCaseId,
    provider: parsed.provider,
    event_type: parsed.event_type,
    event_summary: buildEventSummary(parsed.event_type, normalized.external_case_id),
    actor_type: 'system',
    occurred_at_provider:
      normalized.updated_at_provider ?? normalized.created_at_provider ?? null,
    metadata: {
      external_case_id: normalized.external_case_id,
      order_ref: normalized.order_ref,
      claim_reason: normalized.claim_reason,
      case_status: normalized.case_status,
      event_idempotency: 'not_implemented',
    },
    raw_payload_hash: normalized.raw_payload_hash,
  });

  if (!eventRow || typeof eventRow.id !== 'string') {
    throw new SupportIngestError(500, 'event_insert_failed');
  }

  const linkResult = await linkSupportCaseToCommerceContext(supabase, {
    supportCaseId,
    merchantId: parsed.merchant_id,
  });

  return {
    ok: true,
    provider: normalized.provider,
    support_case_id: supportCaseId,
    event_id: eventRow.id,
    external_case_id: normalized.external_case_id,
    order_ref: normalized.order_ref,
    claim_reason: normalized.claim_reason,
    case_status: normalized.case_status,
    link_status: linkResult.link_status,
    shopify_order_id: linkResult.shopify_order_id,
    customer_profile_id: linkResult.customer_profile_id,
    merchant_claim_id: linkResult.merchant_claim_id,
  };
}
