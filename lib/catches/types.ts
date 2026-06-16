import type { ConfidenceGrade } from '@/lib/engine/weights';

export type MatchedSignalType =
  | 'email_variant'
  | 'address_hash'
  | 'phone_hash'
  | 'device_fp'
  | 'card_match'
  | 'name_variant'
  | 'ip_cluster'
  | 'claim_pattern'
  | 'checkout_signal';

export const SIGNAL_DISPLAY_LABELS: Record<string, string> = {
  email_variant:    'Email root match',
  address_hash:     'Delivery address hash',
  phone_hash:       'Phone hash',
  device_fp:        'Device fingerprint',
  card_match:       'Payment fingerprint',
  name_variant:     'Name variation',
  ip_cluster:       'IP address',
  claim_pattern:    'Similar claim pattern',
  checkout_signal:  'Checkout behaviour',
};

export type IdentityCatchEvent = {
  id: string;
  merchantId: string;
  claimId: string | null;
  orderId: string | null;
  profileId: string | null;
  /** Pre-masked display string — no raw PII (e.g. "m***k+r***s@gmail.com") */
  submittedIdentifierDisplay: string | null;
  /** Pre-masked display string — no raw PII (e.g. "m***k@gmail.com") */
  linkedIdentifierDisplay: string | null;
  matchedSignalTypes: string[];
  confidenceScore: number;
  confidenceGrade: ConfidenceGrade;
  estimatedExposureAmount: number | null;
  estimatedExposureCurrency: string;
  evidencePackId: string | null;
  createdAt: string;
};
