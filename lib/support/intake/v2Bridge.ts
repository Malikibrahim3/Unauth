/**
 * v2 bridge for helpdesk ticket intake: commerce linkage, claim creation and
 * identity-signal emission against the v2 schema (source_tickets / claims /
 * identity_signals). Replaces the legacy customer_profiles / merchant_claims /
 * bulk_upsert_* paths that were dropped at the 2026-06-11 cutover.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { emitIdentityObservations, type ObservationEntity } from '@/lib/identity/observations';
import { resolveIdentitiesForKeys } from '@/lib/identity/resolver';
import { normaliseAddress } from '@/lib/identity/normalise';
import { ensureClaimDecisionEvidence } from '@/lib/claims/decision/ensureEvidence';
import { TABLES } from '@/lib/supabase/tables';
import { extractOrderRefFromText } from '@/lib/support/intake/store';
import { resolveTicketOrderLink } from '@/lib/support/intake/resolveTicketOrderLink';

type Client = SupabaseClient<any>;

export type TicketCustomerRefs = {
  /** helpdesk contact id (e.g. Gorgias customer.id) */
  contactId: string | null;
  /** commerce-platform customer id the helpdesk linked (customer.external_id) */
  platformCustomerExternalId: string | null;
  email: string | null;
  phone: string | null;
};

export function extractTicketCustomer(rawTicket: unknown): TicketCustomerRefs {
  const empty: TicketCustomerRefs = { contactId: null, platformCustomerExternalId: null, email: null, phone: null };
  if (!rawTicket || typeof rawTicket !== 'object') return empty;
  const ticket = (rawTicket as Record<string, unknown>).ticket ?? rawTicket;
  if (!ticket || typeof ticket !== 'object') return empty;
  const customer = (ticket as Record<string, unknown>).customer;
  if (!customer || typeof customer !== 'object') return empty;
  const c = customer as Record<string, unknown>;
  const str = (v: unknown) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  return {
    contactId: str(c.id),
    platformCustomerExternalId: str(c.external_id),
    email: str(c.email),
    phone: str(c.phone),
  };
}

export type TicketLinkResult = {
  link_status: 'linked' | 'unlinked';
  source_customer_id: string | null;
  source_order_id: string | null;
  /** commerce-platform order id (external), kept for legacy response shape */
  shopify_order_id: string | null;
};

/**
 * Resolves the ticket's customer to a source_customers row (via the helpdesk
 * external_id link, falling back to email) and its order_ref to a
 * source_orders row, then persists both links on the source_tickets row.
 */
export async function linkTicketToCommerceV2(
  supabase: Client,
  input: { merchantId: string; ticketId: string; orderRef: string | null; rawTicket: unknown }
): Promise<TicketLinkResult> {
  const refs = extractTicketCustomer(input.rawTicket);

  let customerId: string | null = null;
  if (refs.platformCustomerExternalId) {
    const { data } = await supabase.from('source_customers')
      .select('id')
      .eq('merchant_id', input.merchantId)
      .eq('external_id', refs.platformCustomerExternalId)
      .limit(1).maybeSingle();
    customerId = data?.id ?? null;
  }
  if (!customerId && refs.email) {
    const { data } = await supabase.from('source_customers')
      .select('id')
      .eq('merchant_id', input.merchantId)
      .ilike('email', refs.email)
      .limit(1).maybeSingle();
    customerId = data?.id ?? null;
  }

  let orderId: string | null = null;
  let orderExternalId: string | null = null;
  const ticket = (input.rawTicket ?? {}) as Record<string, unknown>;
  const subject = typeof ticket.subject === 'string' ? ticket.subject : null;

  const orderLink = await resolveTicketOrderLink(supabase, {
    merchantId: input.merchantId,
    orderRef: input.orderRef,
    subject,
    customerEmail: refs.email,
    sourceCustomerId: customerId,
  });
  orderId = orderLink.sourceOrderId;
  if (orderId) {
    const { data } = await supabase
      .from('source_orders')
      .select('external_id')
      .eq('id', orderId)
      .maybeSingle();
    orderExternalId = (data?.external_id as string | undefined) ?? null;
  }

  const linkedRef = orderLink.orderRef ?? (input.orderRef ? input.orderRef.replace(/^#/, '').trim() : extractOrderRefFromText(subject ?? ''));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (customerId) patch.source_customer_id = customerId;
  if (linkedRef) patch.linked_order_external_ids = [linkedRef.replace(/^#/, '')];
  const { error } = await supabase.from('source_tickets')
    .update(patch)
    .eq('id', input.ticketId)
    .eq('merchant_id', input.merchantId);
  if (error) throw new Error(`ticket_link_update_failed: ${error.message}`);

  return {
    link_status: customerId || orderId ? 'linked' : 'unlinked',
    source_customer_id: customerId,
    source_order_id: orderId,
    shopify_order_id: orderExternalId,
  };
}

export async function linkTicketToSourceCustomerFromIntake(
  supabase: Client,
  input: {
    merchantId: string;
    ticketId: string;
    provider: string;
    connectionId: string | null;
    customerEmail: string | null;
    customerName: string | null;
    rawTicket: unknown;
  },
): Promise<string | null> {
  const refs = extractTicketCustomer(input.rawTicket);
  const email = input.customerEmail?.trim() || refs.email?.trim() || null;
  if (!email) return null;

  const nameParts = (input.customerName ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('source_customers')
    .upsert(
      {
        merchant_id: input.merchantId,
        source: input.provider === 'gorgias' ? 'gorgias' : input.provider,
        connection_id: input.connectionId,
        external_id: refs.contactId ?? email,
        email,
        first_name: firstName,
        last_name: lastName,
        updated_at: now,
      },
      { onConflict: 'merchant_id,source,external_id' },
    )
    .select('id')
    .single();
  if (error) throw new Error(`ticket_source_customer_upsert_failed: ${error.message}`);

  await supabase
    .from('source_tickets')
    .update({ source_customer_id: data.id, updated_at: now })
    .eq('id', input.ticketId)
    .eq('merchant_id', input.merchantId);

  return data.id as string;
}

/**
 * Emits hashed identity observations for the ticket (email, helpdesk contact,
 * plus any commerce identifiers visible on the raw payload) and runs the
 * resolution engine. Best-effort: failures log but never break ingestion.
 */
export async function captureTicketIdentitySignalsV2(
  supabase: Client,
  input: {
    merchantId: string;
    ticketId: string;
    provider: string;
    rawTicket: unknown;
    observedAt: string | null;
    phone?: string | null;
    shippingAddressRaw?: string | null;
    billingAddressRaw?: string | null;
    ip?: string | null;
  }
): Promise<string[]> {
  try {
    const refs = extractTicketCustomer(input.rawTicket);
    const source = (['gorgias', 'zendesk', 'freshdesk'].includes(input.provider)
      ? input.provider : 'manual') as ObservationEntity['source'];
    const entity: ObservationEntity = {
      provenance: { ticketId: input.ticketId },
      source,
      observedAt: input.observedAt,
      email: refs.email,
      phone: input.phone ?? refs.phone,
      ip: input.ip ?? null,
      shippingNormalized: normaliseAddress(input.shippingAddressRaw ?? null),
      billingNormalized: normaliseAddress(input.billingAddressRaw ?? null),
      helpdeskContactExternalId: refs.contactId,
    };
    const { signalKeys } = await emitIdentityObservations(supabase, input.merchantId, [entity]);
    if (signalKeys.length === 0) return [];
    const summary = await resolveIdentitiesForKeys(supabase, signalKeys);
    return summary.identityIds;
  } catch (error) {
    console.error('captureTicketIdentitySignalsV2 failed', {
      merchantId: input.merchantId,
      ticketId: input.ticketId,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

const TICKET_CLAIM_TYPE_MAP: Record<string, string> = {
  INR: 'item_not_received',
  damaged: 'damaged',
  wrong_item: 'wrong_item',
  not_as_described: 'not_as_described',
  other: 'other',
};

const DETECTION_METHOD_MAP: Record<string, string> = {
  tag: 'tag',
  keyword_fallback: 'keyword',
  manual: 'manual',
  shopify_dispute: 'platform_dispute',
};

/**
 * Creates or updates a support payout case for a ticket.
 *
 * Creation is gated on claim detection (issue #1008 / CR-1): a new payout
 * case is only inserted when `isClaim` is true. Non-claim tickets are still
 * ingested into source_tickets / source_ticket_events upstream — they just
 * never open a payout case. If a case already exists for the ticket,
 * follow-up events keep updating it, but non-claim-looking follow-ups do not
 * downgrade the existing claim classification.
 */
export async function ensurePayoutCaseForTicketV2(
  supabase: Client,
  input: {
    merchantId: string;
    ticketId: string;
    sourceOrderId: string | null;
    identityId: string | null;
    isClaim: boolean;
    claimType: string | null;
    claimReason: string | null;
    detectionMethod: string;
    triggerTags: string[];
    requiresReview: boolean;
    submittedAt: string | null;
    claimTypeConfidence?: number | null;
    classifierClaimType?: string | null;
    keywordMatched?: string | null;
    requestedAction?: string | null;
    payoutExposureAmount?: number | null;
    payoutExposureCurrency?: string | null;
    ticketSubject?: string | null;
    ticketStatus?: string | null;
  },
): Promise<string | null> {
  const claimType = input.isClaim
    ? (TICKET_CLAIM_TYPE_MAP[input.claimType ?? 'other'] ?? 'other')
    : 'other';
  const detectionMethod = input.isClaim
    ? (DETECTION_METHOD_MAP[input.detectionMethod] ?? 'keyword')
    : 'manual';
  const caseStatus = input.isClaim ? 'open' : 'new';

  const detectionDetail: Record<string, unknown> = {
    trigger_tags: input.triggerTags,
    source: 'helpdesk_intake',
    classification_source: input.detectionMethod,
    needs_classification: !input.isClaim,
    ticket_subject: input.ticketSubject ?? null,
    ticket_status: input.ticketStatus ?? null,
  };
  if (input.claimTypeConfidence != null && Number.isFinite(input.claimTypeConfidence)) {
    detectionDetail.claim_type_confidence = input.claimTypeConfidence;
  }
  if (input.classifierClaimType) {
    detectionDetail.classifier_claim_type = input.classifierClaimType;
  }
  if (input.keywordMatched) {
    detectionDetail.keyword_matched = input.keywordMatched;
  }
  if (input.claimReason) {
    detectionDetail.case_reason = input.claimReason;
  }

  const { data: existingRows, error: le } = await supabase.from(TABLES.MERCHANT_CLAIMS)
    .select('id, status')
    .eq('merchant_id', input.merchantId)
    .eq('source_ticket_id', input.ticketId)
    .order('created_at', { ascending: true })
    .limit(5);
  if (le) throw new Error(`ticket_claim_lookup_failed: ${le.message}`);

  const existing = (existingRows ?? []).find(
    (row) => row.status !== 'voided' && row.status !== 'stale',
  );

  if (existing?.id) {
    const updatePatch: Record<string, unknown> = {
      source_order_id: input.sourceOrderId,
      amount_at_risk: input.payoutExposureAmount ?? null,
      total_estimated_loss: input.payoutExposureAmount ?? null,
      currency: input.payoutExposureCurrency ?? null,
      reason_raw: input.claimReason,
      reason_normalized: input.claimReason,
      requested_action: input.requestedAction ?? 'unknown',
      updated_at: new Date().toISOString(),
    };
    if (input.isClaim) {
      // Only claim-confirming events may change the case classification;
      // non-claim-looking follow-ups keep the existing claim_type/status.
      updatePatch.claim_type = claimType;
      updatePatch.status = caseStatus;
      updatePatch.detection_method = detectionMethod;
      updatePatch.requires_review = input.requiresReview;
      updatePatch.detection_detail = detectionDetail;
    }
    if (input.identityId) {
      updatePatch.identity_id = input.identityId;
    }
    const { error: updateError } = await supabase.from(TABLES.MERCHANT_CLAIMS).update(updatePatch).eq('id', existing.id);
    if (updateError) throw new Error(`ticket_claim_update_failed: ${updateError.message}`);
    return existing.id as string;
  }

  // Gate creation: non-claim tickets never open a payout case.
  if (!input.isClaim) {
    return null;
  }

  const { data: claim, error } = await supabase.from(TABLES.MERCHANT_CLAIMS).insert({
    merchant_id: input.merchantId,
    source_ticket_id: input.ticketId,
    source_order_id: input.sourceOrderId,
    identity_id: input.identityId,
    claim_type: claimType,
    status: caseStatus,
    detection_method: detectionMethod,
    detection_detail: detectionDetail,
    reason_raw: input.claimReason,
    reason_normalized: input.claimReason,
    requested_action: input.requestedAction ?? 'unknown',
    amount_at_risk: input.payoutExposureAmount ?? null,
    total_estimated_loss: input.payoutExposureAmount ?? null,
    currency: input.payoutExposureCurrency ?? null,
    requires_review: input.requiresReview || !input.isClaim,
    submitted_at: input.submittedAt ?? new Date().toISOString(),
  }).select('id').single();
  if (error) throw new Error(`ticket_claim_insert_failed: ${error.message}`);

  const { error: ee } = await supabase.from('claim_events').insert({
    claim_id: claim.id,
    merchant_id: input.merchantId,
    event_type: 'created',
    to_status: caseStatus,
    metadata: { source: 'helpdesk_intake', detection_method: detectionMethod, trigger_tags: input.triggerTags },
  });
  if (ee) throw new Error(`ticket_claim_event_failed: ${ee.message}`);

  await ensureClaimDecisionEvidence({
    client: supabase,
    merchantId: input.merchantId,
    claimId: claim.id as string,
    claimType,
    sourceOrderId: input.sourceOrderId,
    source: 'claim_created',
  });

  return claim.id as string;
}

/** @deprecated Use ensurePayoutCaseForTicketV2 — kept for callers that gate on isClaim. */
export async function ensureClaimForTicketV2(
  supabase: Client,
  input: Parameters<typeof ensurePayoutCaseForTicketV2>[1],
): Promise<string | null> {
  if (!input.isClaim) return null;
  return ensurePayoutCaseForTicketV2(supabase, input);
}
