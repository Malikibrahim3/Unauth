export interface NormalisedOrder {
  orderId: string;
  orderDate: Date;
  emailHash: string;
  addressHash: string | null;         // shipping address hash
  phoneHash: string | null;
  nameHash?: string | null;
  billingAddressHash?: string | null;
  ipHash?: string | null;
  deviceIdHash?: string | null;
  cardFingerprint?: string | null;    // hashed PSP card fingerprint
  cardBin?: string | null;            // first 6-8 digits (BIN/IIN)
  cardLast4?: string | null;          // last 4 digits of card number
  cardBinLast4?: string | null;       // BIN + last4 composite — near-unique card identifier
  browserFingerprint?: string | null; // canvas/WebGL/audio composite hash from client
  cookieIdHash?: string | null;       // persistent first-party browser cookie
  userAgentHash?: string | null;      // browser + OS user agent string
  asnHash?: string | null;            // autonomous system number (ISP/network provider)
  accountIdHash?: string | null;      // merchant platform account ID (logged-in customers)
  customerNameNorm: string;
  orderTotal: number;
  currency: string;
  orderStatus: 'completed' | 'cancelled' | 'refunded' | 'pending';
  refundStatus: 'none' | 'partial' | 'full';
  refundReason: string | null;
  refundDate: Date | null;
  refundAmount: number | null;
  paymentMethod: string | null;
  groundTruthLabel?: 'fraud' | 'legitimate' | 'same_person' | 'different_people' | 'unknown' | null;
  // Dispute-history intelligence (§1 consortium signal).
  // null when the merchant did not provide the column; explicit true/false otherwise.
  chargebackDispute?: boolean | null;
  refundRequested?: boolean | null;
  returnRequested?: boolean | null;
}

/** The four identity confidence grades used by both the fraud scoring and identity clustering systems. */
export type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';

export interface SignalResult {
  name: string;
  fired: boolean;
  score: number;
  reason: string;
  evidence: Record<string, unknown>;
  /**
   * Which identifier types this signal used when it fired.
   * Types: 'email' | 'address' | 'phone' | 'payment' | 'device' | 'ip'
   * Used by §5.1 (data completeness cap) and §5.2 (IP-only guard).
   */
  identifierTypesUsed?: string[];
}

export interface IdentityAlert {
  hasMatch: boolean;
  confidence: number;
  matchReasons: string[];
  historicalRiskSummary: {
    totalPreviousOrders: number;
    totalRefundClaims: number;
    totalChargebacks: number;
    refundRate: number;
    avgDaysToClaim: number | null;
    merchantsSeenAt: number;
  } | null;
  recommendation: 'review' | 'flag' | 'block';
}

export interface ScoredOrder {
  order: NormalisedOrder;
  totalScore: number;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  /**
   * §5.1 / §5.2 — Grade derived from score AND identifier diversity.
   * null = below scoring threshold (totalScore < 25).
   * 'weak' = IP-only signals or single identifier below 25.
   */
  confidenceGrade?: ConfidenceGrade | null;
  flagged: boolean;
  signals: SignalResult[];
  identityAlerts?: IdentityAlert;
}

export type Signal = (
  order: NormalisedOrder,
  context: ScoringContext
) => SignalResult;

export interface ScoringContext {
  allOrders: NormalisedOrder[];
  customerOrderHistory: Map<string, NormalisedOrder[]>;
}

// =============================================================================
// NEW IDENTITY-CONFIDENCE OUTPUT MODEL
// =============================================================================

/** The 8 pair-comparison identity signals */
export type IdentitySignalName =
  | 'emailVariant'    // same base email, different aliases or numeric suffixes
  | 'addressCluster'  // same normalised address, different identity fields
  | 'deviceMatch'     // card fingerprint, browser fingerprint, cookie_id, device_id
  | 'cardMatch'       // card_last4 + card_bin or card_fingerprint match
  | 'ipCluster'       // same IP across different identity presentations
  | 'nameVariant'     // similar names suggesting same person (Levenshtein)
  | 'accountLink'     // same account_id across different surface identities
  | 'phoneMatch';     // same normalised phone number, different email

/** Result of one identity signal comparing two orders */
export interface IdentitySignalResult {
  signal: IdentitySignalName;
  fired: boolean;
  confidence: number;         // 0–100, this signal's contribution to identity confidence
  evidence: string;           // plain English — what was matched
  dataPointsUsed: string[];   // which fields were available and used
  dataPointsMissing: string[]; // which fields were absent — used for confidence degradation
}

/** Factual behavioral statistics about a cluster — no fraud inference */
export interface BehavioralContext {
  totalOrders: number;
  totalRefundClaims: number;
  refundRate: number;                   // 0–1
  avgDaysToClaimRefund: number | null;  // null if no refunds
  fastestClaimDays: number | null;      // null if no refunds
  refundReasons: string[];              // list of distinct reasons given
  orderValueRange: { min: number; max: number; avg: number };
  firstSeen: string;                    // ISO date
  lastSeen: string;                     // ISO date
  paymentMethodsUsed: string[];
}

/** What the merchant actually reads — no fraud language */
export interface MerchantDisplay {
  headline: string;           // e.g. "3 accounts appear to be the same customer"
  confidenceLine: string;     // e.g. "Matched on: same card, address, and email pattern"
  behaviorSummary: string;    // e.g. "4 refund claims across 6 orders, avg 1.8 days to claim"
  recommendedAction: 'no_action' | 'review' | 'manual_verify' | 'escalate';
  actionReason: string;       // plain English reason for recommendation
  dataGapNote?: string;       // present when optional fields are missing
}

/** The primary clustering output — identity-linked group of orders */
export interface IdentityClusterResult {
  clusterId: string;
  orderIds: string[];                     // all orders believed to belong to this person
  identityConfidence: number;             // 0–100, overall confidence these are one person
  confidenceGrade: 'definite' | 'probable' | 'possible' | 'weak';
  signals: IdentitySignalResult[];        // which signals fired to link them
  dataCompleteness: number;              // 0–100, what % of identity fields were available
  behavioralContext: BehavioralContext;   // factual stats — no inference
  merchantDisplay: MerchantDisplay;       // pre-rendered plain English for the UI
}

/** Legacy compatibility — kept during migration */
export interface LegacyScoredOrder {
  order: NormalisedOrder;
  identityResult: IdentityClusterResult;
}
