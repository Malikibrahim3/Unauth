/**
 * Claim classification signals derived from ticket text.
 *
 * This is an ADDITIVE signal layer. It produces the Unauth claim-intelligence
 * enum (`INR | missing_item | damaged | wrong_item | not_as_described | other`) plus a
 * confidence score, and never replaces the existing `claim_reason` normaliser
 * in normalizeTicket.ts (which feeds live commerce-linking logic).
 *
 * Pure functions only — no I/O — so they are cheap to unit test.
 */

export const CLAIM_TYPES = ['INR', 'missing_item', 'damaged', 'wrong_item', 'not_as_described', 'other'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_OUTCOMES = ['approved', 'denied', 'pending', 'unknown'] as const;
export type ClaimOutcome = (typeof CLAIM_OUTCOMES)[number];

export type ClaimClassification = {
  claimType: ClaimType;
  /** 0–1 confidence in the claimType assignment. */
  confidence: number;
};

type WeightedPattern = { re: RegExp; weight: number };

// Highest-signal phrases score near the top of the range; generic single tokens
// score lower so a specific phrase always beats a loose keyword in a mixed ticket.
const CLAIM_TYPE_PATTERNS: Record<Exclude<ClaimType, 'other'>, WeightedPattern[]> = {
  missing_item: [
    { re: /\b(missing|short|absent) (item|product|piece|unit)\b/, weight: 0.96 },
    { re: /\b(item|product|piece|unit) (is |was )?(missing|not in|left out of) (from )?(the |my )?(box|parcel|package|order)\b/, weight: 0.95 },
    { re: /\b(box|parcel|package|order) (arrived|came|was delivered|turned up)[\w\s,;-]*\b(missing|without) (an? |one |the )?(item|product|piece|unit)\b/, weight: 0.97 },
    { re: /\b(received|got) (the |my )?(box|parcel|package|order)[\w\s,;-]*\bbut\b[\w\s,;-]*\b(item|product|piece|unit) (is |was )?(missing|absent)\b/, weight: 0.98 },
    { re: /\bpartial (order|delivery) (missing|short)\b/, weight: 0.94 },
    { re: /\bshort[- ]?(pick|picked|shipment|shipped)\b/, weight: 0.93 },
  ],
  INR: [
    { re: /\bitem not received\b/, weight: 0.92 },
    { re: /\bnever (arrived|received|came|showed up|got here|turned up|delivered)\b/, weight: 0.9 },
    { re: /\bmissing (package|parcel|order|delivery)\b/, weight: 0.9 },
    { re: /\b(item|order|package|parcel|delivery) (not|never) (received|arrived|delivered)\b/, weight: 0.9 },
    { re: /\b(hasn'?t|haven'?t|didn'?t|did not|has not|have not) (arrived|come|been delivered|shown up|showed up)\b/, weight: 0.86 },
    { re: /\bwhere(?:'?s| is| are)? my (order|package|parcel|item|stuff|delivery)\b/, weight: 0.85 },
    { re: /\b(not|never) delivered\b/, weight: 0.85 },
    { re: /\b(did not|didn'?t|never) receive\b/, weight: 0.85 },
    { re: /\b(hasn'?t|haven'?t) received\b/, weight: 0.9 },
    { re: /\binr\b/, weight: 0.8 },
  ],
  damaged: [
    { re: /\b(arrived|came|turned up|showed up|received it) [\w\s]*?(broken|smashed|shattered|cracked|damaged|destroyed)\b/, weight: 0.92 },
    { re: /\bsmashed\b/, weight: 0.9 },
    { re: /\b(shattered|destroyed)\b/, weight: 0.88 },
    { re: /\bdamaged\b/, weight: 0.86 },
    { re: /\b(broken|cracked)\b/, weight: 0.85 },
    { re: /\bdefective\b/, weight: 0.85 },
    { re: /\bfaulty\b/, weight: 0.82 },
    { re: /\b(not working|doesn'?t work|stopped working|won'?t (turn on|work))\b/, weight: 0.82 },
  ],
  wrong_item: [
    { re: /\bnot what i ordered\b/, weight: 0.92 },
    { re: /\bwrong (item|size|colou?r|product|thing|one|model|variant)\b/, weight: 0.9 },
    { re: /\b(sent|shipped|received|got|delivered) (me )?(the |a )?wrong\b/, weight: 0.88 },
    { re: /\bincorrect (item|product|order|size|colou?r)\b/, weight: 0.85 },
    { re: /\bdifferent (product|item|thing)\b/, weight: 0.85 },
    { re: /\bincorrect\b/, weight: 0.68 },
    { re: /\bwrong\b/, weight: 0.6 },
  ],
  not_as_described: [
    { re: /\bnot as described\b/, weight: 0.92 },
    { re: /\bmisrepresented\b/, weight: 0.86 },
    { re: /\bnot as (advertised|pictured|shown|expected)\b/, weight: 0.85 },
    { re: /\bnothing like (the )?(photos?|pictures?|images?|description|listing|advert)\b/, weight: 0.85 },
    { re: /\bdoesn'?t match the (photos?|pictures?|images?|description|listing)\b/, weight: 0.85 },
    { re: /\b(looks?|looked) (nothing |completely )?different\b/, weight: 0.78 },
    { re: /\bmisleading\b/, weight: 0.8 },
  ],
};

// Explicit claim-language markers (STEP 3 #3) used for is-claim detection.
const CLAIM_MARKERS: RegExp[] = [
  /\brefund\b/,
  /\bclaim\b/,
  /\bchargeback\b/,
  /\bdispute\b/,
  /\breimburs/,
  /\bmoney back\b/,
  /\bnot received\b/,
  /\bnever (received|arrived)\b/,
  /\bdamaged\b/,
  /\bwhere(?:'?s| is)\b/,
  /\bwrong item\b/,
  /\bmissing item\b/,
  /\bmissing (package|parcel)\b/,
  /\bnot delivered\b/,
];

const CHARGEBACK_THREAT_PATTERNS: RegExp[] = [
  /\b(dispute|disputing) (it |this |the charge |the payment )?with my bank\b/,
  /\b(call|calling|contact|contacting|tell) my (bank|card (company|issuer)|credit card)\b/,
  /\b(file|filing|open|opening|raise|raising|start|starting) a (dispute|chargeback)\b/,
  /\bchargeback\b/,
  /\bdispute the (charge|payment|transaction)\b/,
  /\bget my (bank|card company) involved\b/,
  /\breverse the (charge|payment|transaction)\b/,
];

// Minimal sentiment lexicon — "basic sentiment analysis" per spec, not a model.
const NEGATIVE_TERMS = [
  'angry', 'furious', 'terrible', 'awful', 'horrible', 'worst', 'disgusted', 'unacceptable',
  'scam', 'fraud', 'ripoff', 'rip off', 'never again', 'disappointed', 'frustrated', 'frustrating',
  'useless', 'broken', 'damaged', 'smashed', 'dispute', 'chargeback', 'lawyer', 'legal', 'sue',
  'refund', 'complaint', 'demand', 'ridiculous', 'appalling', 'hate', 'lied', 'lying',
];
const POSITIVE_TERMS = [
  'thank', 'thanks', 'appreciate', 'great', 'love', 'excellent', 'happy', 'pleased',
  'wonderful', 'amazing', 'awesome', 'helpful', 'kind', 'perfect', 'satisfied', 'grateful',
];

function normaliseText(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join('\n')
    .toLowerCase()
    // Fold typographic apostrophes/quotes to ASCII so patterns like `haven'?t`
    // match real-world text where mail clients send curly quotes ("haven’t",
    // "I’d"). Without this, INR/refund phrases silently miss and downgrade to
    // claim_type 'other'.
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"');
}

/**
 * Classify ticket text into a claim type with a confidence score.
 * Returns { claimType: 'other', confidence: 0 } for empty / unmatched input.
 */
export function classifyClaimType(...parts: Array<string | null | undefined>): ClaimClassification {
  const haystack = normaliseText(...parts);
  if (!haystack.trim()) return { claimType: 'other', confidence: 0 };

  let best: { claimType: ClaimType; confidence: number } = { claimType: 'other', confidence: 0 };

  for (const claimType of Object.keys(CLAIM_TYPE_PATTERNS) as Array<Exclude<ClaimType, 'other'>>) {
    const matched = CLAIM_TYPE_PATTERNS[claimType].filter(({ re }) => re.test(haystack));
    if (matched.length === 0) continue;

    const topWeight = Math.max(...matched.map((m) => m.weight));
    // Small corroboration boost when multiple distinct phrases agree.
    const boost = Math.min(0.06, (matched.length - 1) * 0.03);
    const confidence = Math.min(0.98, topWeight + boost);

    if (confidence > best.confidence) {
      best = { claimType, confidence: Number(confidence.toFixed(4)) };
    }
  }

  return best;
}

/**
 * Detect whether a ticket is a claim at all — explicit claim language OR a
 * high-confidence claim-type match.
 */
export function detectIsClaim(...parts: Array<string | null | undefined>): boolean {
  const haystack = normaliseText(...parts);
  if (!haystack.trim()) return false;
  if (CLAIM_MARKERS.some((re) => re.test(haystack))) return true;
  return classifyClaimType(haystack).confidence >= 0.8;
}

export function detectChargebackThreatened(...parts: Array<string | null | undefined>): boolean {
  const haystack = normaliseText(...parts);
  if (!haystack.trim()) return false;
  return CHARGEBACK_THREAT_PATTERNS.some((re) => re.test(haystack));
}

/** Crude lexicon sentiment in [-1, 1]; 0 when no sentiment terms are present. */
export function scoreSentiment(...parts: Array<string | null | undefined>): number {
  const haystack = normaliseText(...parts);
  if (!haystack.trim()) return 0;

  let neg = 0;
  let pos = 0;
  for (const term of NEGATIVE_TERMS) if (haystack.includes(term)) neg += 1;
  for (const term of POSITIVE_TERMS) if (haystack.includes(term)) pos += 1;

  const total = neg + pos;
  if (total === 0) return 0;
  return Number(((pos - neg) / total).toFixed(4));
}

/**
 * Infer a claim outcome from applied macros when no explicit outcome field is
 * set (e.g. a "Refund Approved" macro implies approved). Matches macros only —
 * not tags — so it never overrides the explicit-field outcome convention.
 * Returns null when nothing is inferable.
 */
export function inferOutcomeFromMacros(
  macros: Array<string | null | undefined> = []
): ClaimOutcome | null {
  const haystack = macros
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.toLowerCase())
    .join(' | ');
  if (!haystack.trim()) return null;

  if (/(refund|claim|return|replacement|credit)[\w\s-]*?(approv|grant|issu|process|complet)/.test(haystack)) {
    return 'approved';
  }
  if (/(refund|claim|return|dispute)[\w\s-]*?(deni|declin|reject|refus)/.test(haystack)) {
    return 'denied';
  }
  if (/(pending|under review|awaiting|investigat)/.test(haystack)) {
    return 'pending';
  }
  return null;
}
