import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertClaimEvidenceItem, upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { claimGateTypeToStoredClaimType } from '@/lib/claim-gate/classifyClaim';
import { getAppUrl } from '@/lib/utils/appUrl';
import type {
  ClaimGateActorType,
  ClaimGateCase,
  ClaimGateClaimType,
  ClaimGateDecision,
  ClaimGateEvidence,
  ClaimGateSource,
} from '@/lib/claim-gate/types';
import type { RequestedAction } from '@/lib/payouts/types';

function clean(value: string | null | undefined): string | null {
  const s = value?.trim();
  return s ? s : null;
}

function ticketProvider(source: string | null | undefined): 'gorgias' | 'zendesk' | 'freshdesk' {
  if (source === 'zendesk' || source === 'freshdesk') return source;
  return 'gorgias';
}

function evidenceProvider(source: string | null | undefined): 'gorgias' | 'zendesk' | 'manual' {
  if (source === 'zendesk') return 'zendesk';
  if (source === 'gorgias') return 'gorgias';
  return 'manual';
}

function requestedAction(value: string | null | undefined): RequestedAction {
  const text = (value ?? '').toLowerCase();
  if (text.includes('reship')) return 'reship';
  if (text.includes('replace')) return 'replacement';
  if (text.includes('credit')) return 'store_credit';
  if (text.includes('discount')) return 'discount';
  if (text.includes('investigat')) return 'investigation';
  if (text.includes('escalat')) return 'escalation';
  if (text.includes('refund')) return 'refund';
  return 'unknown';
}

function appBaseUrl(): string {
  return getAppUrl();
}

async function ensureTicket(input: {
  client: SupabaseClient;
  merchantId: string;
  source: ClaimGateSource | string | undefined;
  externalTicketId: string;
  customerEmail: string;
  claimText: string;
  gorgiasDomain?: string | null;
  existingTicketId?: string | null;
}): Promise<string> {
  if (input.existingTicketId) return input.existingTicketId;
  const provider = ticketProvider(input.source);
  const { data, error } = await input.client
    .from('source_tickets')
    .upsert(
      {
        merchant_id: input.merchantId,
        provider,
        external_id: input.externalTicketId,
        subject: input.claimText.slice(0, 180),
        status: 'open',
        channel: 'api',
        linked_order_external_ids: [],
        updated_at_provider: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,provider,external_id' },
    )
    .select('id')
    .single();
  if (error) throw new Error(`claim_gate_ticket_upsert_failed: ${error.message}`);
  return data.id as string;
}

export async function createOrUpdateClaim(input: {
  client: SupabaseClient;
  merchantId: string;
  source?: ClaimGateSource | string;
  actorType: ClaimGateActorType;
  externalTicketId: string;
  externalOrderId?: string | null;
  customerEmail: string;
  claimType: ClaimGateClaimType;
  claimText: string;
  requestedAction?: string | null;
  gorgiasDomain?: string | null;
  evidence: ClaimGateEvidence;
  decision?: ClaimGateDecision;
}): Promise<ClaimGateCase> {
  const ticketId = await ensureTicket({
    client: input.client,
    merchantId: input.merchantId,
    source: input.source,
    externalTicketId: input.externalTicketId,
    customerEmail: input.customerEmail,
    claimText: input.claimText,
    gorgiasDomain: input.gorgiasDomain,
    existingTicketId: clean(input.evidence.ticket?.id as string | null | undefined),
  });
  const orderId = clean(input.evidence.order?.id as string | null | undefined);
  const storedClaimType = claimGateTypeToStoredClaimType(input.claimType);
  const claim = await upsertMerchantClaim(input.client, {
    merchant_id: input.merchantId,
    source_ticket_id: ticketId,
    source_order_id: orderId,
    claim_type: storedClaimType,
    status: input.decision && input.decision.gateStatus !== 'PROCEED' ? 'manual_review' : 'open',
    detection_method: input.source === 'gorgias' ? 'keyword' : 'manual',
    customer_claim_reason: input.claimText,
    amount_at_risk: input.evidence.moneyAtRisk,
    currency: input.evidence.currency,
    requested_action: requestedAction(input.requestedAction),
    requires_merchant_review: input.decision ? input.decision.gateStatus !== 'PROCEED' : false,
    trigger_tags: ['claim_gate_check'],
  }, { transitionExisting: true, transitionSource: 'claim_gate_check' });

  await upsertClaimEvidenceItem(input.client, {
    claim_id: claim.id,
    merchant_id: input.merchantId,
    evidence_type: 'customer_message',
    source: evidenceProvider(input.source),
    metadata: {
      claim_text: input.claimText,
      source: input.source ?? 'unknown',
      actor_type: input.actorType,
      external_ticket_id: input.externalTicketId,
      requested_action: input.requestedAction ?? null,
    },
  });

  if (input.decision) {
    await appendClaimEvent(input.client, {
      claim_id: claim.id,
      merchant_id: input.merchantId,
      event_type: 'claim_updated',
      previous_status: claim.status,
      new_status: claim.status,
      note: `Claim gate checked: ${input.decision.gateStatus}`,
      triggered_by: 'claim_gate_check',
      metadata: {
        gate_status: input.decision.gateStatus,
        actor_type: input.actorType,
        source: input.source ?? 'unknown',
        external_ticket_id: input.externalTicketId,
        triggered_rules: input.decision.triggeredRules,
        allowed_actions: input.decision.allowedActions,
        blocked_actions: input.decision.blockedActions,
        evidence_summary: input.evidence.summary,
      },
    });
  }

  const caseUrl = `${appBaseUrl()}/cases?focus=${encodeURIComponent(claim.id)}`;
  return {
    id: claim.id,
    claim_type: storedClaimType,
    status: claim.status,
    case_url: caseUrl,
  };
}
