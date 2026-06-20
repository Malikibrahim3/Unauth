import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { TABLES } from '@/lib/supabase/tables';
import { SUPPORT_PROVIDERS } from '@/lib/support/providers/types';
import {
  normalizeSupportTicket,
  toSupportCaseIntakeUpsertInput,
} from '@/lib/support/intake/normalizeTicket';
import {
  appendSupportCaseEvent,
  upsertSupportCaseIntake,
} from '@/lib/support/intake/store';
import { extractCommerceSignals } from '@/lib/support/intake/commerceSignals';
import {
  captureTicketIdentitySignalsV2,
  ensureClaimForTicketV2,
  linkTicketToCommerceV2,
} from '@/lib/support/intake/v2Bridge';
import type { ClaimType } from '@/lib/support/intake/classifyClaim';
import { classifyClaimType } from '@/lib/support/intake/classifyClaim';
import {
  detectClaimFromTags,
  getMerchantClaimTagConfig,
  type ClaimDetectionResult,
  type HelpdeskMessageForClaimDetection,
} from '@/lib/support/intake/tagClaimDetection';
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
  link_status: 'linked' | 'unlinked';
  shopify_order_id: string | null;
  customer_profile_id: string | null;
  // Payout-case-first fields (the canonical shape going forward).
  support_payout_case_id: string | null;
  case_reason: string | null;
  is_payout_case: boolean;
  requested_action: string | null;
  payout_exposure: { amount: number; currency: string | null } | null;
  // Legacy aliases retained during the staged rename.
  merchant_claim_id: string | null;
  is_claim: boolean;
  claim_type: ClaimType | null;
  claim_type_confidence: number | null;
  detection_method: string;
  trigger_tag: string | null;
  requires_merchant_review: boolean;
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


function extractMessagesForClaimDetection(rawTicket: unknown): HelpdeskMessageForClaimDetection[] {
  const ticket = (rawTicket ?? {}) as Record<string, unknown>;
  const rawMessages = Array.isArray(ticket.messages)
    ? ticket.messages
    : Array.isArray(ticket.comments)
      ? ticket.comments
      : Array.isArray(ticket.conversation_parts)
        ? ticket.conversation_parts
        : [];

  const messages: HelpdeskMessageForClaimDetection[] = [];
  for (const message of rawMessages) {
    if (!message || typeof message !== 'object') continue;
    const row = message as Record<string, unknown>;
    const source = row.source && typeof row.source === 'object'
      ? (row.source as Record<string, unknown>)
      : null;
    const author = row.author && typeof row.author === 'object'
      ? (row.author as Record<string, unknown>)
      : null;
    const sourceType = typeof source?.type === 'string' ? source.type : undefined;
    const authorType = typeof author?.type === 'string' ? author.type : undefined;
    const fromAgent =
      row.from_agent === true ||
      row.is_from_agent === true ||
      row.public === false ||
      row.sender_type === 'agent' ||
      sourceType === 'internal-note' ||
      authorType === 'admin' ||
      authorType === 'bot';

    messages.push({
      body: typeof row.body === 'string' ? row.body : null,
      body_text: typeof row.body_text === 'string' ? row.body_text : typeof row.plain_body === 'string' ? row.plain_body : null,
      body_html: typeof row.body_html === 'string' ? row.body_html : null,
      sender_type: typeof row.sender_type === 'string' ? row.sender_type : fromAgent ? 'agent' : 'customer',
      message_type: sourceType === 'internal-note' ? 'internal_note' : typeof row.message_type === 'string' ? row.message_type : null,
        source_type: typeof row.source_type === 'string' ? row.source_type : authorType === 'bot' ? 'automated' : null,
        is_from_agent: fromAgent,
        from_agent: fromAgent,
        is_automated: row.is_automated === true,
      });
  }
  return messages;
}

function applyClaimDetection(
  normalized: NormalizedSupportCaseIntake,
  detection: ClaimDetectionResult
): void {
  if (detection.action !== 'create_or_confirm_claim') {
    normalized.is_claim = false;
    normalized.claim_type = null;
    normalized.claim_type_confidence = null;
    normalized.detection_method = 'tag';
    normalized.trigger_tag = detection.action === 'void' || detection.action === 'update_status' ? detection.triggerTag : null;
    normalized.trigger_tags = [];
    normalized.requires_merchant_review = detection.requiresMerchantReview;
    normalized.keyword_matched = null;
    return;
  }

  const classification = classifyClaimType(
    normalized.customer_message_summary,
    normalized.claim_reason,
    normalized.tags.join(' ')
  );
  normalized.is_claim = true;
  normalized.claim_type = classification.claimType;
  normalized.claim_type_confidence = classification.confidence;
  normalized.detection_method = detection.detectionMethod;
  normalized.trigger_tag = detection.triggerTag;
  normalized.trigger_tags = detection.triggerTags;
  normalized.requires_merchant_review = detection.requiresMerchantReview;
  normalized.keyword_matched = detection.keywordMatched ?? null;
}

function buildEventSummary(eventType: string, externalCaseId: string): string {
  return truncateSafeText(`${eventType} (${externalCaseId})`, 200);
}

function inferRequestedActionFromReason(reason: string | null): string | null {
  switch (reason) {
    case 'refund_request':
    case 'return_request':
    case 'dispute':
      return 'refund';
    case 'missing_parcel':
      return 'reship';
    case 'wrong_item':
      return 'replacement';
    case 'damaged_item':
      return 'replacement';
    default:
      return null;
  }
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
  const tagConfig = await getMerchantClaimTagConfig(supabase, parsed.merchant_id, normalized.provider);
  const detection = detectClaimFromTags(
    tagConfig.config,
    {
      tags: normalized.tags,
      messages: extractMessagesForClaimDetection(parsed.raw),
      created_at_provider: normalized.created_at_provider,
    },
    { usingDefaultConfig: tagConfig.isDefault }
  );
  applyClaimDetection(normalized, detection);

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

  // v2: commerce linkage, identity signals + resolution, first-class claim.
  const linkResult = await linkTicketToCommerceV2(supabase as SupabaseClient<Database>, {
    merchantId: parsed.merchant_id,
    ticketId: supportCaseId,
    orderRef: normalized.order_ref,
    rawTicket: parsed.raw,
  });

  const commerce = extractCommerceSignals(parsed.raw);
  const identityIds = await captureTicketIdentitySignalsV2(supabase as SupabaseClient<Database>, {
    merchantId: parsed.merchant_id,
    ticketId: supportCaseId,
    provider: parsed.provider,
    rawTicket: parsed.raw,
    observedAt: normalized.created_at_provider,
    phone: commerce.identity.phone,
    shippingAddressRaw: commerce.identity.shipping_address,
    billingAddressRaw: commerce.identity.billing_address,
    ip: commerce.identity.ip_address,
  });

  const requestedAction = inferRequestedActionFromReason(normalized.claim_reason);
  const payoutExposureAmount = commerce.order.refund_amount_requested ?? commerce.order.order_value;

  const claimId = await ensureClaimForTicketV2(supabase as SupabaseClient<Database>, {
    merchantId: parsed.merchant_id,
    ticketId: supportCaseId,
    sourceOrderId: linkResult.source_order_id,
    identityId: identityIds[0] ?? null,
    isClaim: normalized.is_claim ?? false,
    claimType: normalized.claim_type ?? null,
    claimReason: normalized.claim_reason,
    detectionMethod: normalized.detection_method,
    triggerTags: normalized.trigger_tags ?? [],
    requiresReview: normalized.requires_merchant_review ?? false,
    submittedAt: normalized.created_at_provider,
    claimTypeConfidence: normalized.claim_type_confidence,
    classifierClaimType: normalized.claim_type,
    keywordMatched: normalized.keyword_matched,
    requestedAction,
    payoutExposureAmount,
    payoutExposureCurrency: null,
  });

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
    customer_profile_id: null,
    support_payout_case_id: claimId,
    case_reason: normalized.claim_reason,
    is_payout_case: normalized.is_claim,
    requested_action: requestedAction,
    payout_exposure:
      payoutExposureAmount != null
        ? { amount: payoutExposureAmount, currency: null }
          : null,
    merchant_claim_id: claimId,
    is_claim: normalized.is_claim,
    claim_type: normalized.claim_type,
    claim_type_confidence: normalized.claim_type_confidence,
    detection_method: normalized.detection_method,
    trigger_tag: normalized.trigger_tag,
    requires_merchant_review: normalized.requires_merchant_review,
  };
}

/**
 * Best-effort claim-intelligence capture: order context, hashed identity
 * signals, cross-merchant link detection, and the per-merchant claim summary.
 * Failures here never break core ticket ingestion.
 */
