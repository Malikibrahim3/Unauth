/**
 * Builds a plain-language behavioral summary for a customer profile.
 *
 * Rules:
 * - Maximum 3 sentences
 * - Factual language only — no inference, no judgment words
 * - Banned words: suspicious, fraudulent, concerning, abusive, risky, alarming
 */

export interface NarrativeContext {
  totalOrders: number;
  totalRefundClaims: number;
  refundRate: number;
  fastestClaimDays: number | null;
  avgClaimDays: number | null;
  refundAccelerationScore: number;
  firstSeen: string;
  lastSeen: string;
  fraudFlags: string[];
  linkedAccountCount: number;
}

// Words that must never appear in generated narratives
const BANNED_WORDS = [
  'suspicious',
  'fraudulent',
  'concerning',
  'abusive',
  'risky',
  'alarming',
  'fraud',
  'scam',
];

function assertNoBannedWords(text: string): void {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      throw new Error(`Narrative contains banned word: "${word}"`);
    }
  }
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pluralise(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * Builds a 1–3 sentence factual behavioral narrative for the customer panel.
 *
 * Sentence 1 (always): Order activity over time period.
 * Sentence 2 (conditional): Refund statistics, if any refunds claimed.
 * Sentence 3 (conditional): Notable pattern from acceleration score or linked accounts.
 */
export function buildBehavioralNarrative(ctx: NarrativeContext): string {
  const sentences: string[] = [];

  // --- Sentence 1: Order activity ---
  const firstDate = formatDateShort(ctx.firstSeen);
  const lastDate = formatDateShort(ctx.lastSeen);

  const sameDay = ctx.firstSeen.slice(0, 10) === ctx.lastSeen.slice(0, 10);

  if (ctx.totalOrders === 1) {
    sentences.push(`This profile has 1 recorded order, first seen on ${firstDate}.`);
  } else if (sameDay) {
    sentences.push(
      `This profile has ${ctx.totalOrders} recorded ${pluralise(ctx.totalOrders, 'order', 'orders')}, all seen on ${firstDate}.`
    );
  } else {
    sentences.push(
      `This profile has ${ctx.totalOrders} recorded ${pluralise(ctx.totalOrders, 'order', 'orders')} between ${firstDate} and ${lastDate}.`
    );
  }

  // --- Sentence 2: Refund statistics ---
  if (ctx.totalRefundClaims > 0) {
    const pct = Math.round(ctx.refundRate * 100);
    let sentence = `${ctx.totalRefundClaims} of those ${pluralise(ctx.totalOrders, 'order was', 'orders were')} followed by a refund claim (${pct}% rate)`;

    if (ctx.fastestClaimDays !== null && ctx.fastestClaimDays <= 1) {
      sentence += `, with the quickest claim submitted within 1 day of purchase`;
    } else if (ctx.fastestClaimDays !== null && ctx.fastestClaimDays <= 3) {
      sentence += `, with the quickest claim submitted within ${ctx.fastestClaimDays} ${pluralise(ctx.fastestClaimDays, 'day', 'days')} of purchase`;
    }

    sentences.push(`${sentence}.`);
  }

  // --- Sentence 3: Notable pattern (max 1) ---
  if (sentences.length < 3) {
    if (ctx.refundAccelerationScore >= 75 && ctx.totalRefundClaims >= 2) {
      sentences.push(
        `The time between order and refund claim has decreased across multiple orders.`
      );
    } else if (ctx.linkedAccountCount > 0) {
      sentences.push(
        `${ctx.linkedAccountCount} additional ${pluralise(ctx.linkedAccountCount, 'identity', 'identities')} in the system share a signal with this profile.`
      );
    } else if (ctx.fraudFlags.length > 0) {
      const count = ctx.fraudFlags.length;
      sentences.push(
        `${count} behaviour ${pluralise(count, 'pattern', 'patterns')} from this profile match known detection criteria.`
      );
    }
  }

  const narrative = sentences.join(' ');

  // Safety check — never throw in production, return cleaned text
  try {
    assertNoBannedWords(narrative);
  } catch {
    // Fallback: strip the offending sentence and return what remains
    const safe = sentences
      .filter((s) => {
        const lower = s.toLowerCase();
        return !BANNED_WORDS.some((w) => lower.includes(w));
      })
      .join(' ');
    return safe || `This profile has ${ctx.totalOrders} recorded ${pluralise(ctx.totalOrders, 'order', 'orders')}.`;
  }

  return narrative;
}
