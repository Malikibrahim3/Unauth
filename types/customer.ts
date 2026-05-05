/**
 * Customer Intelligence Model — §8 of the UI/UX Refinement Plan.
 *
 * This is the SINGLE data shape consumed by both the Customer Drawer (§9) and
 * the Full Customer Page (§10). No duplicate schemas.
 *
 * If the API returns a different shape, write an adapter in
 * `lib/adapters/customer.ts` — do NOT duplicate fields here.
 */

import type { SignalType, SignalStrength } from '@/components/ui/SignalBadge';
import type { ConfidenceGradeValue } from '@/components/ui/ConfidenceBadge';
import type { RiskLevel } from '@/components/ui/RiskScoreBadge';
import type { RecommendedActionKey } from '@/components/ui/RecommendedActionCard';
import type { TimelineEventItem } from '@/components/ui/Timeline';

export type { ConfidenceGradeValue, RiskLevel, RecommendedActionKey, SignalType, SignalStrength };

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface Address {
  line1: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

export interface CardSignal {
  last4: string;
  scheme?: string;
}

export interface DeviceFingerprint {
  fingerprint: string;
  userAgent?: string;
}

export interface LinkedIdentity {
  id: string;
  name: string | null;
  emails: string[];
  phones: string[];
  addresses: Address[];
  accountIds: string[];
  cardSignals: CardSignal[];
  ips?: string[];
  devices?: DeviceFingerprint[];
  confidence: { grade: ConfidenceGradeValue; score: number };
  linkedBy: SignalType[];
}

export interface Evidence {
  id: string;
  signalType: SignalType;
  strength: SignalStrength;
  headline: string;
  detail: string;
  metadata: { label: string; value: string }[];
  contradicts?: boolean;
}

export interface Transaction {
  id: string;
  date: string; // ISO
  amount: number;
  currency: string;
  emailUsed: string;
  nameUsed: string | null;
  refund: { status: 'none' | 'partial' | 'full'; amount: number; reason: string | null };
  chargeback: { filed: boolean; date?: string; reason?: string };
  delivery: { status: 'pending' | 'shipped' | 'delivered' | 'failed' };
  riskScore: number;
  matchedSignals: SignalType[];
}

export interface SharedSignalGroup {
  signalType: SignalType;
  strength: SignalStrength;
  count: number;
  values: { value: string; usedByIdentityIds: string[] }[];
}

export interface RefundSummary {
  count: number;
  totalAmount: number;
  rate: number; // 0..1
  topReasons: { reason: string; count: number }[];
  timingNote?: string;
}

export interface ChargebackSummary {
  count: number;
  totalAmount: number;
  winRate?: number; // 0..1
  items: { date: string; orderId: string; reason?: string; status?: string }[];
}

export interface MerchantNote {
  id: string;
  authorName: string;
  authorAvatarInitials: string;
  date: string; // ISO
  body: string;
  tags?: string[];
}

export type CustomerStatus = 'open' | 'dismissed' | 'confirmed_fraud' | 'marked_safe';

// ---------------------------------------------------------------------------
// Root type
// ---------------------------------------------------------------------------

export interface CustomerIntelligence {
  id: string;
  primary: {
    name: string | null;
    email: string;
    avatarInitials: string; // derived from name or email
  };
  confidence: { grade: ConfidenceGradeValue; score: number };
  risk: { level: RiskLevel; score: number };
  recommendation: {
    action: RecommendedActionKey;
    confidence: ConfidenceGradeValue;
    rationale: string; // 1–2 sentences
    supportingEvidenceIds: string[];
    falsePositiveRisk: {
      level: 'low' | 'medium' | 'high';
      contradictingEvidenceIds: string[];
      explanation: string;
    };
  };
  metrics: {
    totalOrderValue: number;
    totalRefundedValue: number;
    chargebackCount: number;
    linkedIdentityCount: number;
    linkedTransactionCount: number;
    refundRate: number; // 0..1
    refundCount: number;
  };
  whyFlagged: {
    headline: string; // 1 sentence
    bullets: { signalType: SignalType; text: string }[];
  };
  linkedIdentities: LinkedIdentity[];
  evidence: Evidence[]; // ordered strongest first
  transactions: Transaction[]; // ordered most recent first
  refundHistory: RefundSummary;
  chargebackHistory: ChargebackSummary;
  sharedSignals: SharedSignalGroup[]; // grouped by signal type
  timeline: TimelineEventItem[];
  notes?: MerchantNote[];
  status: CustomerStatus;
  evidencePackage?: { id: string; status: 'draft' | 'ready' | 'exported'; url?: string };
  firstSeen?: string; // ISO
  lastSeen?: string; // ISO
}
