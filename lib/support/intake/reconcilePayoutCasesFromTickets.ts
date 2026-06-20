import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { SOURCE_DELETED_TICKET_STATUS } from '@/lib/support/gorgias/reconcileDeletedTickets';
import {
  detectClaimFromTags,
  getMerchantClaimTagConfig,
} from '@/lib/support/intake/tagClaimDetection';
import type { SupportProvider } from '@/lib/support/providers/types';
import { classifyClaimType } from '@/lib/support/intake/classifyClaim';
import { normalizeClaimReasonFromText } from '@/lib/support/intake/normalizeTicket';
import { resolveTicketOrderLink } from '@/lib/support/intake/resolveTicketOrderLink';
import { ensurePayoutCaseForTicketV2 } from '@/lib/support/intake/v2Bridge';

type TicketRow = {
  id: string;
  external_id: string;
  subject: string | null;
  status: string | null;
  tags: unknown;
  linked_order_external_ids: unknown;
  source_customer_id: string | null;
  created_at_provider: string | null;
};

function readTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === 'string');
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
    case 'damaged_item':
      return 'replacement';
    default:
      return null;
  }
}

function ticketMessagesFromSubject(subject: string | null) {
  if (!subject?.trim()) return [];
  return [{ body: subject, body_text: subject, sender_type: 'customer' as const }];
}

export async function reconcilePayoutCasesFromTickets(input: {
  supabase: SupabaseClient;
  merchantId: string;
  provider?: string;
}): Promise<{ tickets_scanned: number; cases_created_or_updated: number }> {
  const provider = (input.provider ?? 'gorgias') as SupportProvider;
  const { data: tickets, error } = await input.supabase
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select(
      'id, external_id, subject, status, tags, linked_order_external_ids, source_customer_id, created_at_provider',
    )
    .eq('merchant_id', input.merchantId)
    .eq('provider', provider)
    .neq('status', SOURCE_DELETED_TICKET_STATUS);

  if (error) throw new Error(`payout_case_reconcile_lookup_failed: ${error.message}`);

  const tagConfig = await getMerchantClaimTagConfig(input.supabase, input.merchantId, provider);
  let casesCreatedOrUpdated = 0;

  for (const row of (tickets ?? []) as TicketRow[]) {
    const tags = readTags(row.tags);
    const subjectMessages = ticketMessagesFromSubject(row.subject);
    const detection = detectClaimFromTags(
      tagConfig.config,
      {
        tags,
        messages: subjectMessages,
        created_at_provider: row.created_at_provider,
      },
      { usingDefaultConfig: tagConfig.isDefault },
    );

    const isClaim = detection.action === 'create_or_confirm_claim';
    const classification = isClaim
      ? classifyClaimType(row.subject, null, tags.join(' '))
      : classifyClaimType(row.subject, null, tags.join(' '));

    let customerEmail: string | null = null;
    if (row.source_customer_id) {
      const { data: customer } = await input.supabase
        .from('source_customers')
        .select('email')
        .eq('id', row.source_customer_id)
        .maybeSingle();
      customerEmail = (customer?.email as string | undefined) ?? null;
    }

    const orderLink = await resolveTicketOrderLink(input.supabase, {
      merchantId: input.merchantId,
      subject: row.subject,
      linkedOrderExternalIds: row.linked_order_external_ids,
      customerEmail,
      sourceCustomerId: row.source_customer_id,
    });

    if (orderLink.orderRef) {
      await input.supabase
        .from(TABLES.SUPPORT_CASE_INTAKE)
        .update({
          linked_order_external_ids: [orderLink.orderRef.replace(/^#/, '')],
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('merchant_id', input.merchantId);
    }

    const sourceOrderId = orderLink.sourceOrderId;
    const claimReason = normalizeClaimReasonFromText(row.subject ?? '', tags);
    const treatAsClaim =
      isClaim ||
      (classification.confidence >= 0.45 &&
        (classification.claimType === 'INR' ||
          (row.subject?.toLowerCase().includes('refund') ?? false)));

    const claimId = await ensurePayoutCaseForTicketV2(input.supabase, {
      merchantId: input.merchantId,
      ticketId: row.id,
      sourceOrderId,
      identityId: null,
      isClaim: treatAsClaim,
      claimType: classification.claimType,
      claimReason,
      detectionMethod: isClaim ? detection.detectionMethod : 'keyword_fallback',
      triggerTags: isClaim ? detection.triggerTags : [],
      requiresReview: true,
      submittedAt: row.created_at_provider,
      claimTypeConfidence: classification.confidence,
      classifierClaimType: classification.claimType,
      keywordMatched: isClaim ? detection.keywordMatched ?? null : 'subject_keywords',
      requestedAction: inferRequestedActionFromReason(claimReason),
      payoutExposureAmount: orderLink.totalPrice,
      payoutExposureCurrency: orderLink.currency,
      ticketSubject: row.subject,
      ticketStatus: row.status,
    });

    if (claimId) casesCreatedOrUpdated += 1;
  }

  return {
    tickets_scanned: (tickets ?? []).length,
    cases_created_or_updated: casesCreatedOrUpdated,
  };
}
