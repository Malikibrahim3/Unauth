import type { SupportProvider } from '@/lib/support/providers/types';

export type ClaimDetectionMethod = 'tag' | 'keyword_fallback' | 'manual' | 'shopify_dispute';

export type MerchantClaimTagConfig = {
  claim_trigger_tags: string[];
  outcome_tags: Record<string, string>;
  void_tags: string[];
  keyword_fallback_enabled: boolean;
};

export type HelpdeskMessageForClaimDetection = {
  body?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  sender_type?: string | null;
  message_type?: string | null;
  source_type?: string | null;
  is_from_agent?: boolean | null;
  from_agent?: boolean | null;
  is_automated?: boolean | null;
};

export type HelpdeskTicketForClaimDetection = {
  tags: string[];
  messages?: HelpdeskMessageForClaimDetection[];
  created_at_provider?: string | null;
};

export type ClaimDetectionResult =
  | { action: 'void'; triggerTag: string; requiresMerchantReview: boolean }
  | {
      action: 'update_status';
      newStatus: string;
      triggerTag: string;
      requiresMerchantReview: boolean;
    }
  | {
      action: 'create_or_confirm_claim';
      detectionMethod: Extract<ClaimDetectionMethod, 'tag' | 'keyword_fallback'>;
      triggerTag: string | null;
      triggerTags: string[];
      requiresMerchantReview: boolean;
      keywordMatched?: string;
    }
  | { action: 'no_claim'; requiresMerchantReview: boolean };

export const DEFAULT_TAG_CONFIGS: Record<SupportProvider, MerchantClaimTagConfig> = {
  gorgias: {
    claim_trigger_tags: [
      'RETURN/EXCHANGE',
      'return/exchange',
      'refund-request',
      'refund_request',
      'refund-requested',
      'refund_requested',
      'chargeback',
      'dispute',
      'fraud',
    ],
    outcome_tags: {
      'refund-issued': 'resolved_refunded',
      refund_issued: 'resolved_refunded',
      'refund-approved': 'resolved_refunded',
      'exchange-completed': 'resolved_exchanged',
      'claim-denied': 'resolved_denied',
      'chargeback-won': 'resolved_won',
      'chargeback-lost': 'resolved_lost',
    },
    void_tags: ['not-a-claim', 'false-positive', 'legitimate-return'],
    keyword_fallback_enabled: true,
  },
  zendesk: {
    claim_trigger_tags: [
      'refund_requested',
      'return_requested',
      'chargeback_filed',
      'dispute',
      'fraud_suspected',
    ],
    outcome_tags: {
      refund_issued: 'resolved_refunded',
      return_approved: 'resolved_exchanged',
      claim_denied: 'resolved_denied',
      chargeback_won: 'resolved_won',
      chargeback_lost: 'resolved_lost',
    },
    void_tags: ['not_a_claim', 'false_positive'],
    keyword_fallback_enabled: true,
  },
  freshdesk: {
    claim_trigger_tags: ['refund-request', 'return-request', 'chargeback', 'dispute'],
    outcome_tags: {
      'refund-issued': 'resolved_refunded',
      resolved: 'resolved_refunded',
      denied: 'resolved_denied',
    },
    void_tags: ['not-a-claim'],
    keyword_fallback_enabled: true,
  },
  intercom: {
    claim_trigger_tags: ['refund-request', 'return-request', 'chargeback', 'dispute', 'fraud'],
    outcome_tags: {
      'refund-issued': 'resolved_refunded',
      'claim-denied': 'resolved_denied',
      'chargeback-won': 'resolved_won',
      'chargeback-lost': 'resolved_lost',
    },
    void_tags: ['not-a-claim', 'false-positive'],
    keyword_fallback_enabled: true,
  },
};

const FALLBACK_KEYWORDS = [
  'chargeback',
  'dispute',
  'fraud',
  'not authorized',
  'not received',
  "didn't receive",
  'did not receive',
  'never arrived',
  'package never came',
];

const FALLBACK_KEYWORD_PATTERN = new RegExp(
  FALLBACK_KEYWORDS.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

export function getDefaultTagConfig(platform: SupportProvider): MerchantClaimTagConfig {
  return DEFAULT_TAG_CONFIGS[platform];
}

export function detectClaimFromKeywords(ticket: HelpdeskTicketForClaimDetection): string | null {
  const customerMessages = (ticket.messages ?? []).filter((message) => {
    const sender = message.sender_type?.trim().toLowerCase();
    const messageType = message.message_type?.trim().toLowerCase();
    const sourceType = message.source_type?.trim().toLowerCase();
    return (
      (sender === 'customer' || (!sender && !message.from_agent && !message.is_from_agent)) &&
      messageType !== 'internal_note' &&
      sourceType !== 'automated' &&
      sourceType !== 'system' &&
      sender !== 'system' &&
      message.is_automated !== true &&
      message.is_from_agent !== true &&
      message.from_agent !== true
    );
  });

  for (const message of customerMessages) {
    const body = (message.body_text ?? message.body_html ?? message.body ?? '').toLowerCase();
    const matched = body.match(FALLBACK_KEYWORD_PATTERN);
    if (matched) return matched[0].toLowerCase();
  }

  return null;
}

export function detectClaimFromTags(
  config: MerchantClaimTagConfig | null,
  ticket: HelpdeskTicketForClaimDetection,
  options: { usingDefaultConfig?: boolean; now?: Date } = {}
): ClaimDetectionResult {
  const effectiveConfig = config ?? DEFAULT_TAG_CONFIGS.gorgias;
  const ticketTags = ticket.tags.map(normalizeTag);
  const tagSet = new Set(ticketTags);

  const voidTag = effectiveConfig.void_tags.map(normalizeTag).find((tag) => tagSet.has(tag));
  if (voidTag) return { action: 'void', triggerTag: voidTag, requiresMerchantReview: false };

  for (const [tag, status] of Object.entries(effectiveConfig.outcome_tags)) {
    const normalizedTag = normalizeTag(tag);
    if (tagSet.has(normalizedTag)) {
      return {
        action: 'update_status',
        newStatus: status,
        triggerTag: normalizedTag,
        requiresMerchantReview: false,
      };
    }
  }

  const triggerTags = effectiveConfig.claim_trigger_tags.flatMap((tag) => {
    const normalized = normalizeTag(tag);
    return tagSet.has(normalized) ? [normalized] : [];
  });
  if (triggerTags.length > 0) {
    const createdAt = ticket.created_at_provider ? Date.parse(ticket.created_at_provider) : NaN;
    const now = options.now ?? new Date();
    const isOldTicket =
      Number.isFinite(createdAt) && now.getTime() - createdAt > 90 * 86_400_000;

    return {
      action: 'create_or_confirm_claim',
      detectionMethod: 'tag',
      triggerTag: triggerTags[0],
      triggerTags,
      requiresMerchantReview: Boolean(options.usingDefaultConfig || isOldTicket),
    };
  }

  if (effectiveConfig.keyword_fallback_enabled) {
    const keywordMatched = detectClaimFromKeywords(ticket);
    if (keywordMatched) {
      return {
        action: 'create_or_confirm_claim',
        detectionMethod: 'keyword_fallback',
        triggerTag: null,
        triggerTags: [],
        requiresMerchantReview: true,
        keywordMatched,
      };
    }
  }

  return { action: 'no_claim', requiresMerchantReview: false };
}

export async function getMerchantClaimTagConfig(
  _supabase: unknown,
  _merchantId: string,
  platform: SupportProvider
): Promise<{ config: MerchantClaimTagConfig; isDefault: boolean }> {
  // v2 SCHEMA NOTE: the `merchant_claim_tag_configs` table was dropped in the
  // v2 cutover with no replacement. Per-merchant tag overrides are therefore
  // unavailable; every merchant uses the built-in default config for their
  // platform. Detection already treats `isDefault: true` as "use default", and
  // sets requiresMerchantReview on default-config tag detections, so this is a
  // safe, honest degradation rather than fabricating per-merchant config.
  return { config: getDefaultTagConfig(platform), isDefault: true };
}
