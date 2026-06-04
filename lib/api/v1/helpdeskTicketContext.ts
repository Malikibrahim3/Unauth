import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildGorgiasWidgetModel,
  type GorgiasWidgetModel,
  type WidgetStats,
} from '@/lib/gorgias/widgetData';
import type { LookupAuth } from '@/lib/api/v1/lookup';

export type HelpdeskTicketContextBody = {
  state:
    | 'merchant_profile'
    | 'network_match'
    | 'low_clear'
    | 'not_found'
    | 'error';
  profile_url: string | null;
  confidence: string | null;
  matched_on: string[];
  store: {
    orders: number;
    claims: number;
    primary_reason: string | null;
    recent_claims_90d: number;
  } | null;
  network: {
    orders: number;
    claims: number;
    merchants: number;
    recent_claims_90d: number;
  } | null;
  claims_record: {
    refunds: number;
    chargebacks: number;
    source: 'your_store' | 'network';
    cross_merchant: { merchant_count: number; claim_count: number } | null;
    refund_value: number | null;
    last_claim_at: string | null;
  } | null;
  ce3_evidence_available: boolean;
  message: string | null;
};

function statsToStoreNetwork(stats: WidgetStats | null): {
  store: HelpdeskTicketContextBody['store'];
  network: HelpdeskTicketContextBody['network'];
} {
  if (!stats) {
    return { store: null, network: null };
  }
  return {
    store: {
      orders: stats.storeOrders,
      claims: stats.storeClaims,
      primary_reason: stats.primaryReason,
      recent_claims_90d: stats.storeRecentClaims,
    },
    network: {
      orders: stats.networkOrders,
      claims: stats.networkClaims,
      merchants: stats.networkMerchants,
      recent_claims_90d: stats.networkRecentClaims,
    },
  };
}

export function serializeHelpdeskTicketContext(model: GorgiasWidgetModel): HelpdeskTicketContextBody {
  switch (model.state) {
    case 'merchant_profile': {
      const { store, network } = statsToStoreNetwork(model.stats);
      return {
        state: 'merchant_profile',
        profile_url: model.profileUrl,
        confidence: model.confidenceGrade,
        matched_on: [],
        store,
        network,
        claims_record: null,
        ce3_evidence_available: false,
        message: null,
      };
    }
    case 'network_match':
      return {
        state: 'network_match',
        profile_url: model.profileUrl,
        confidence: model.confidenceGrade,
        matched_on: model.matchedOn,
        store: model.merchantProfile
          ? {
              orders: model.merchantProfile.totalOrders,
              claims: model.merchantProfile.totalRefunds,
              primary_reason: null,
              recent_claims_90d: 0,
            }
          : null,
        network: null,
        claims_record: {
          refunds: model.claimsRecord.refunds,
          chargebacks: model.claimsRecord.chargebacks,
          source: model.claimsRecord.source,
          cross_merchant: model.claimsRecord.cross_merchant,
          refund_value: null,
          last_claim_at: null,
        },
        ce3_evidence_available: model.ce3EvidenceAvailable,
        message: null,
      };
    case 'low_clear':
      return {
        state: 'low_clear',
        profile_url: model.profileUrl,
        confidence: model.merchantProfile.confidenceGrade,
        matched_on: [],
        store: {
          orders: model.merchantProfile.totalOrders,
          claims: model.merchantProfile.totalRefunds,
          primary_reason: null,
          recent_claims_90d: 0,
        },
        network: null,
        claims_record: {
          refunds: 0,
          chargebacks: 0,
          source: 'your_store',
          cross_merchant: null,
          refund_value: null,
          last_claim_at: null,
        },
        ce3_evidence_available: false,
        message: null,
      };
    case 'not_found':
      return {
        state: 'not_found',
        profile_url: null,
        confidence: null,
        matched_on: [],
        store: null,
        network: null,
        claims_record: null,
        ce3_evidence_available: false,
        message: null,
      };
    case 'error':
      return {
        state: 'error',
        profile_url: null,
        confidence: null,
        matched_on: [],
        store: null,
        network: null,
        claims_record: null,
        ce3_evidence_available: false,
        message: model.message,
      };
    default:
      return {
        state: 'error',
        profile_url: null,
        confidence: null,
        matched_on: [],
        store: null,
        network: null,
        claims_record: null,
        ce3_evidence_available: false,
        message: 'Unknown widget state',
      };
  }
}

export async function performHelpdeskTicketContext(
  service: SupabaseClient,
  auth: LookupAuth,
  params: { rawEmail: string; rawName: string; orderRef: string },
): Promise<HelpdeskTicketContextBody> {
  const built = await buildGorgiasWidgetModel(service, auth, {
    rawEmail: params.rawEmail,
    rawName: params.rawName,
    orderId: params.orderRef,
  });
  return serializeHelpdeskTicketContext(built.model);
}
