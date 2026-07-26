export interface IdentityTimelineEntry {
  date: string;
  field: 'email' | 'name' | 'address' | 'ip' | 'card_last4';
  value: string;
  isVariant: boolean;
}

export interface OrderHistoryEntry {
  transactionId: string;
  orderId: string;
  orderDate: string | null;
  processedAt: string;
  email: string | null;
  viaEmail?: string | null;
  name: string | null;
  address: string | null;
  ip: string | null;
  cardLast4: string | null;
  orderValue: number | null;
  fraudScore: number;
  riskLevel: string;
  fraudFlags: string[];
  refundStatus: string | null;
  refundRequested: boolean;
  refundReason: string | null;
  refundDate: string | null;
  refundAmount: number | null;
  returnRequested: boolean;
  chargebackFiled: boolean;
  chargebackDate: string | null;
  chargebackReasonCode: string | null;
}

export interface LinkedAccount {
  entityType: string;
  entityValue: string;
  confidence: number;
  matchReasons: string[];
}

export interface CustomerIntelligencePanel {
  profile: {
    id: string;
    primary_email: string | null;
    emails: string[];
    names: string[];
    addresses: string[];
    ips: string[];
    card_last4s: string[];
    phones: string[];
    risk_score: number;
    risk_level: string;
    fraud_flags: string[];
    total_orders: number;
    commerce_total_value?: number;
    commerce_order_source?: string;
    total_refund_claims: number;
    total_chargebacks: number;
    total_merchants_seen_at: number;
    sibling_count?: number;
    linked_customer_emails?: string[];
    refund_requests_365d: number;
    completed_refunds_365d: number;
    completed_refund_amounts_by_currency: Record<string, number>;
    possible_match_count: number;
    refund_rate: number;
    fastest_claim_days: number | null;
    avg_claim_days: number | null;
    refund_acceleration_score: number;
    first_seen: string;
    last_seen: string;
    profile_confidence: number;
    manually_reviewed: boolean;
    /** @deprecated Customer watchlists are retired. */
    on_watchlist: boolean;
    /** @deprecated Customer watchlists are retired. */
    watchlist_entry_id: string | null;
  };
  orderHistory: OrderHistoryEntry[];
  identityTimeline: IdentityTimelineEntry[];
  linkedAccounts: LinkedAccount[];
  narrative: string;
}
