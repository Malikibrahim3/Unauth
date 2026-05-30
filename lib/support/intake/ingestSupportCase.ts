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
import {
  appendSupportCaseEvent,
  upsertCustomerIdentitySignals,
  upsertOrderClaimContext,
  upsertSupportCaseIntake,
} from '@/lib/support/intake/store';
import {
  extractCommerceSignals,
  extractOrdersAtMerchant,
} from '@/lib/support/intake/commerceSignals';
import { recomputeCustomerClaimSummary } from '@/lib/support/intake/claimSummary';
import { detectIdentityLinkCandidates } from '@/lib/support/intake/identityLinking';
import type { ClaimType } from '@/lib/support/intake/classifyClaim';
import type { NormalizedSupportCaseIntake } from '@/lib/support/intake/normalizeTicket';

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
  merchant_id: string;
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
  is_claim: boolean;
  claim_type: ClaimType | null;
  claim_type_confidence: number | null;
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

  if (normalized.is_claim) {
    await captureClaimSignals(supabase, client, {
      supportCaseId,
      merchantId: parsed.merchant_id,
      normalized,
      rawTicket: parsed.raw,
    });
  }

  return {
    ok: true,
    provider: normalized.provider,
    merchant_id: parsed.merchant_id,
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
    is_claim: normalized.is_claim,
    claim_type: normalized.claim_type,
    claim_type_confidence: normalized.claim_type_confidence,
  };
}

/**
 * Best-effort claim-intelligence capture: order context, hashed identity
 * signals, cross-merchant link detection, and the per-merchant claim summary.
 * Failures here never break core ticket ingestion.
 */
async function captureClaimSignals(
  supabase: unknown,
  client: Parameters<typeof upsertOrderClaimContext>[0] &
    Parameters<typeof upsertCustomerIdentitySignals>[0],
  input: {
    supportCaseId: string;
    merchantId: string;
    normalized: NormalizedSupportCaseIntake;
    rawTicket: unknown;
  }
): Promise<void> {
  try {
    const commerce = extractCommerceSignals(input.rawTicket);
    const ordersAtMerchant = extractOrdersAtMerchant(input.rawTicket);
    const emailHash = input.normalized.customer_email_hash;

    await upsertOrderClaimContext(client, {
      ...commerce.order,
      support_case_id: input.supportCaseId,
      merchant_id: input.merchantId,
      order_ref: input.normalized.order_ref ?? commerce.order.order_ref,
    });

    if (emailHash) {
      const { hashes } = await upsertCustomerIdentitySignals(client, {
        merchant_id: input.merchantId,
        customer_email_hash: emailHash,
        phone: commerce.identity.phone,
        shipping_address: commerce.identity.shipping_address,
        billing_address: commerce.identity.billing_address,
        ip_address: commerce.identity.ip_address,
        device_fingerprint: commerce.identity.device_fingerprint,
        customer_account_type: commerce.identity.customer_account_type,
        account_created_at: commerce.identity.account_created_at,
        claimed_at: commerce.claimed_at,
      });
      await detectIdentityLinkCandidates(supabase, { merchantId: input.merchantId, hashes });
    }

    await recomputeCustomerClaimSummary(supabase, {
      merchantId: input.merchantId,
      emailHash,
      knownOrderCount: ordersAtMerchant,
    });
  } catch {
    // Signal capture is best-effort; never break ticket ingestion.
  }
}
