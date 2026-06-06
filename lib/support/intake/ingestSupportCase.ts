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
import { upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import {
  extractCommerceSignals,
  extractOrdersAtMerchant,
} from '@/lib/support/intake/commerceSignals';
import { recomputeCustomerClaimSummary } from '@/lib/support/intake/claimSummary';
import { detectIdentityLinkCandidates } from '@/lib/support/intake/identityLinking';
import type { ClaimType } from '@/lib/support/intake/classifyClaim';
import { classifyClaimType } from '@/lib/support/intake/classifyClaim';
import {
  detectClaimFromTags,
  getMerchantClaimTagConfig,
  type ClaimDetectionResult,
  type HelpdeskMessageForClaimDetection,
} from '@/lib/support/intake/tagClaimDetection';
import type { NormalizedSupportCaseIntake } from '@/lib/support/intake/normalizeTicket';

type MerchantClaimType =
  | 'missing_parcel'
  | 'damaged'
  | 'wrong_item'
  | 'refund_request'
  | 'chargeback'
  | 'return_abuse'
  | 'other';

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

function mapClaimTypeForMerchantClaim(claimType: ClaimType | null): MerchantClaimType {
  switch (claimType) {
    case 'INR':
      return 'missing_parcel';
    case 'damaged':
      return 'damaged';
    case 'wrong_item':
      return 'wrong_item';
    case 'not_as_described':
      return 'other';
    default:
      return 'other';
  }
}

async function ensureMerchantClaimForSupportCase(
  supabase: unknown,
  input: {
    merchantId: string;
    supportCaseId: string;
    normalized: NormalizedSupportCaseIntake;
    linkResult: { shopify_order_id: string | null; customer_profile_id: string | null; merchant_claim_id: string | null };
  }
): Promise<string | null> {
  if (input.linkResult.merchant_claim_id) {
    await appendClaimEvent(supabase, {
      claim_id: input.linkResult.merchant_claim_id,
      merchant_id: input.merchantId,
      shop_domain: input.normalized.shop_domain,
      event_type: 'claim_updated',
      triggered_by: input.normalized.detection_method === 'tag' ? `tag:${input.normalized.trigger_tag ?? 'unknown'}` : 'keyword_fallback',
      metadata: {
        triggered_by: input.normalized.detection_method === 'tag' ? `tag:${input.normalized.trigger_tag ?? 'unknown'}` : 'keyword_fallback',
        source: input.normalized.detection_method === 'tag' ? 'helpdesk_tag' : 'helpdesk_keyword_fallback',
        support_case_id: input.supportCaseId,
        external_case_id: input.normalized.external_case_id,
        trigger_tag: input.normalized.trigger_tag,
        trigger_tags: input.normalized.trigger_tags,
        detection_method: input.normalized.detection_method,
        idempotent_retrigger: true,
      },
    });
    return input.linkResult.merchant_claim_id;
  }
  if (!input.normalized.is_claim) return null;
  if (!input.linkResult.shopify_order_id || !input.normalized.shop_domain) return null;

  const claimType = mapClaimTypeForMerchantClaim(input.normalized.claim_type);
  const existingClaimId = await findExistingMerchantClaimId(supabase, {
    merchantId: input.merchantId,
    normalized: input.normalized,
    linkResult: input.linkResult,
  });
  const claimPayload = {
    merchant_id: input.merchantId,
    shop_domain: input.normalized.shop_domain,
    shopify_order_id: input.linkResult.shopify_order_id,
    customer_id: input.linkResult.customer_profile_id,
    claim_type: claimType,
    customer_claim_reason: input.normalized.claim_reason ?? null,
    normalized_reason: input.normalized.claim_reason ?? null,
    status: 'open' as const,
    amount_at_risk: null,
    currency: null,
    submitted_at: input.normalized.created_at_provider ?? new Date().toISOString(),
    actor_user_id: null,
    detection_method: input.normalized.detection_method,
    trigger_tag: input.normalized.trigger_tag,
    trigger_tags: input.normalized.trigger_tags,
    requires_merchant_review: input.normalized.requires_merchant_review,
  };

  const claim = await upsertMerchantClaim(supabase, claimPayload, { ignoreDuplicates: true });
  if (!claim?.id) return null;
  const claimId = String(claim.id);

  await (supabase as { from: (table: string) => any })
    .from('support_case_intake')
    .update({ merchant_claim_id: claimId, updated_at: new Date().toISOString() })
    .eq('id', input.supportCaseId)
    .eq('merchant_id', input.merchantId);

  await appendClaimEvent(supabase, {
    claim_id: claimId,
    merchant_id: input.merchantId,
    shop_domain: input.normalized.shop_domain,
    event_type: existingClaimId ? 'claim_updated' : 'claim_created',
    new_status: claim.status ?? 'open',
    triggered_by: input.normalized.detection_method === 'tag' ? `tag:${input.normalized.trigger_tag ?? 'unknown'}` : 'keyword_fallback',
    metadata: {
      triggered_by: input.normalized.detection_method === 'tag' ? `tag:${input.normalized.trigger_tag ?? 'unknown'}` : 'keyword_fallback',
      source: input.normalized.detection_method === 'tag' ? 'helpdesk_tag' : 'helpdesk_keyword_fallback',
      support_case_id: input.supportCaseId,
      external_case_id: input.normalized.external_case_id,
      trigger_tag: input.normalized.trigger_tag,
      trigger_tags: input.normalized.trigger_tags,
      detection_method: input.normalized.detection_method,
    },
  });

  return claimId;
}

async function findExistingMerchantClaimId(
  supabase: unknown,
  input: {
    merchantId: string;
    normalized: NormalizedSupportCaseIntake;
    linkResult: { shopify_order_id: string | null; merchant_claim_id: string | null };
  }
): Promise<string | null> {
  if (input.linkResult.merchant_claim_id) return input.linkResult.merchant_claim_id;
  if (!input.linkResult.shopify_order_id || !input.normalized.shop_domain) return null;

  const existing = await (supabase as { from: (table: string) => any })
    .from('merchant_claims')
    .select('id,status')
    .eq('merchant_id', input.merchantId)
    .eq('shop_domain', input.normalized.shop_domain)
    .eq('shopify_order_id', input.linkResult.shopify_order_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return existing?.data?.id ? String(existing.data.id) : null;
}

async function applyExistingClaimTagAction(
  supabase: unknown,
  input: {
    merchantId: string;
    normalized: NormalizedSupportCaseIntake;
    linkResult: { shopify_order_id: string | null; merchant_claim_id: string | null };
    detection: ClaimDetectionResult;
  }
): Promise<string | null> {
  if (input.detection.action !== 'update_status' && input.detection.action !== 'void') {
    return input.linkResult.merchant_claim_id;
  }

  const claimId = await findExistingMerchantClaimId(supabase, input);
  if (!claimId) return null;

  const status = input.detection.action === 'void' ? 'voided' : input.detection.newStatus;
  await Promise.all([
    (supabase as { from: (table: string) => any })
      .from('merchant_claims')
      .update({
        status,
        trigger_tag: input.detection.triggerTag,
        requires_merchant_review: input.detection.requiresMerchantReview,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('merchant_id', input.merchantId),
    appendClaimEvent(supabase as any, {
    claim_id: claimId,
    merchant_id: input.merchantId,
    shop_domain: input.normalized.shop_domain,
    event_type: status === 'escalated' ? 'escalation_added' : 'status_changed',
    new_status: status,
    triggered_by: `tag:${input.detection.triggerTag}`,
    metadata: {
      triggered_by: `tag:${input.detection.triggerTag}`,
      trigger_tag: input.detection.triggerTag,
      support_case_id: input.normalized.external_case_id,
    },
  }),
  ]);

  await (supabase as { from: (table: string) => any })
    .from('support_case_intake')
    .update({ merchant_claim_id: claimId, updated_at: new Date().toISOString() })
    .eq('merchant_id', input.merchantId)
    .eq('provider', input.normalized.provider)
    .eq('external_case_id', input.normalized.external_case_id);

  return claimId;
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

  const linkResult = await linkSupportCaseToCommerceContext(supabase, {
    supportCaseId,
    merchantId: parsed.merchant_id,
  });

  const tagActionClaimId = await applyExistingClaimTagAction(supabase, {
    merchantId: parsed.merchant_id,
    normalized,
    linkResult,
    detection,
  });

  const ensuredMerchantClaimId =
    detection.action === 'create_or_confirm_claim'
      ? await ensureMerchantClaimForSupportCase(supabase, {
          merchantId: parsed.merchant_id,
          supportCaseId,
          normalized,
          linkResult,
        })
      : tagActionClaimId;

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
    merchant_claim_id: ensuredMerchantClaimId ?? linkResult.merchant_claim_id,
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
  } catch (error) {
    // Signal capture is best-effort; never break ticket ingestion.
    console.error('captureClaimSignals failed', {
      merchantId: input.merchantId,
      supportCaseId: input.supportCaseId,
      externalCaseId: input.normalized.external_case_id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
