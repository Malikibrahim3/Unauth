import type { NormalisedOrder, SignalResult, ScoredOrder, ConfidenceGrade } from './types';
import { SIGNAL_WEIGHTS, RISK_TIER_THRESHOLDS, FLAG_THRESHOLD } from './weights';
import type { FastScoringContext } from './fastContext';
import { cleanOrderTotal } from '../csv/clean';
import { buildIdentityClusters, generateIdentityAlert, type IdentityClusterMap } from './identityMatching';
import { normaliseEmail, normaliseIP, normaliseAddress, normaliseCard } from '../identity/normalise';
import { computeCrossMerchantSignal } from './signals/crossMerchant';

// ---------------------------------------------------------------------------
// Fast signal implementations using precomputed O(1) context lookups
// ---------------------------------------------------------------------------

function refundRate(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const customerOrders = ctx.customerOrderHistory.get(order.emailHash) ?? [];
  const notFired: SignalResult = {
    name: 'refundRate',
    fired: false,
    score: 0,
    reason: 'Customer refund rate within population baseline.',
    evidence: {},
  };

  if (customerOrders.length < 3) return notFired;

  const refundedCount = customerOrders.filter(
    (o) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
  ).length;
  const customerRate = refundedCount / customerOrders.length;

  const { mean, stddev } = ctx.populationRefundStats;
  const threshold = mean + 2 * stddev;

  if (customerRate <= threshold) return notFired;

  const zscore = (customerRate - mean) / stddev;
  const score = Math.min(100, Math.round(zscore * 25));

  return {
    name: 'refundRate',
    fired: true,
    score,
    reason: `Customer refund rate is ${(customerRate * 100).toFixed(0)}% across ${customerOrders.length} orders, which is ${zscore.toFixed(1)} standard deviations above the population baseline of ${(mean * 100).toFixed(0)}%.`,
    evidence: { customerRate, populationMean: mean, populationStddev: stddev, zscore, orderCount: customerOrders.length, refundedCount },
    identifierTypesUsed: ['email'],
  };
}

function inrAbuse(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const customerOrders = ctx.customerOrderHistory.get(order.emailHash) ?? [];
  const inrCount = customerOrders.filter((o) => o.refundReason === 'inr').length;

  if (inrCount < 2) {
    return {
      name: 'inrAbuse',
      fired: false,
      score: 0,
      reason: 'Customer has fewer than 2 INR claims.',
      evidence: { inrCount },
    };
  }

  const scoreMap: Record<number, number> = { 2: 40, 3: 70 };
  const score = inrCount >= 4 ? 95 : (scoreMap[inrCount] ?? 40);

  return {
    name: 'inrAbuse',
    fired: true,
    score,
    reason: `Customer has made ${inrCount} "item not received" claims across their order history.`,
    evidence: { inrCount, totalOrders: customerOrders.length },
    identifierTypesUsed: ['email'],
  };
}

function velocity(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const maxWindow = ctx.customerMaxVelocity.get(order.emailHash) ?? 0;

  if (maxWindow < 3) {
    return {
      name: 'velocity',
      fired: false,
      score: 0,
      reason: 'No burst ordering detected.',
      evidence: { maxOrdersIn24h: maxWindow },
    };
  }

  const score = Math.min(90, 50 + 10 * (maxWindow - 3));

  return {
    name: 'velocity',
    fired: true,
    score,
    reason: `Customer placed ${maxWindow} orders within a 24-hour window.`,
    evidence: { maxOrdersIn24h: maxWindow, totalOrders: (ctx.customerOrderHistory.get(order.emailHash) ?? []).length },
    identifierTypesUsed: ['email'],
  };
}

function inrSpeed(order: NormalisedOrder): SignalResult {
  const SUSPICIOUS_HOURS = 120; // 5 days — conservative default for international delivery
  if (order.refundReason !== 'inr' || !order.refundDate) {
    return {
      name: 'inrSpeed',
      fired: false,
      score: 0,
      reason: 'Order is not an INR claim or has no refund date.',
      evidence: {},
    };
  }

  const hoursToRefund = (order.refundDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60);

  if (hoursToRefund >= SUSPICIOUS_HOURS) {
    return {
      name: 'inrSpeed',
      fired: false,
      score: 0,
      reason: `INR claim made ${hoursToRefund.toFixed(0)}h after order — within expected delivery window.`,
      evidence: { hoursToRefund },
    };
  }

  return {
    name: 'inrSpeed',
    fired: true,
    score: 80,
    reason: `Customer claimed item not received ${hoursToRefund.toFixed(0)} hours after placing the order — too fast for typical delivery (threshold: ${SUSPICIOUS_HOURS}h).`,
    evidence: { hoursToRefund, orderDate: order.orderDate.toISOString(), refundDate: order.refundDate.toISOString() },
  };
}

function emailPattern(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const rawEmails = ctx.emailRawEmailsMap.get(order.emailHash) ?? [];

  if (rawEmails.length === 0) {
    return {
      name: 'emailPattern',
      fired: false,
      score: 0,
      reason: 'No raw email data available for pattern analysis.',
      evidence: {},
    };
  }

  const sampleEmail = rawEmails[0].toLowerCase();
  const [local, domain] = sampleEmail.split('@');

  if (!domain) {
    return {
      name: 'emailPattern',
      fired: false,
      score: 0,
      reason: 'Email address format invalid.',
      evidence: {},
    };
  }

  // Check for disposable domains — expanded list of well-known providers
  const disposableDomains = new Set([
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'throwawaymail.com', 'yopmail.com', 'getairmail.com', 'temp-mail.org',
    'dispostable.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
    'guerrillamail.org', 'spam4.me', 'trashmail.com', 'trashmail.at', 'trashmail.io',
    'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.xyz',
    'maildrop.cc', 'mailnull.com', 'spamgourmet.com', 'spamgourmet.net',
    'spamgourmet.org', 'spamfree24.org', 'spam.la', 'trashmail.fr',
    'filzmail.com', 'throwam.com', 'fakeinbox.com', 'mailnesia.com',
    'spamevader.com', 'mytrashmail.com', 'mailboxy.fun', 'tempinbox.com',
    'discard.email', 'discardmail.com', 'spambox.us', 'jetable.fr.nf',
    'mail-temporaire.fr', 'nwldx.com', 'spamthisplease.com', 'wegwerfmail.de',
    'wegwerfmail.net', 'wegwerfmail.org', 'tempail.com', 'spamherelots.com',
  ]);
  if (disposableDomains.has(domain)) {
    return {
      name: 'emailPattern',
      fired: true,
      score: 60,
      reason: `Customer is using a known disposable email domain (${domain}).`,
      evidence: { domain, type: 'disposable' },
      identifierTypesUsed: ['email'],
    };
  }

  if (local.includes('+')) {
    const rootLocal = local.split('+')[0];
    const aliasCount = rawEmails.filter((e) => {
      const [l] = e.toLowerCase().split('@');
      return l.startsWith(rootLocal + '+');
    }).length;

    if (aliasCount >= 2) {
      return {
        name: 'emailPattern',
        fired: true,
        score: 70,
        reason: `Customer is using plus-aliasing (${aliasCount} variations of the same root address detected).`,
        evidence: { rootLocal, domain, aliasCount, type: 'plus-alias' },
        identifierTypesUsed: ['email'],
      };
    }
  }

  const numericSuffixMatch = local.match(/^([a-z]+)\d{3,}$/);
  if (numericSuffixMatch) {
    const prefix = numericSuffixMatch[1];
    const allEmails = Array.from(ctx.emailRawEmailsMap.values()).flat();
    const clusterCount = allEmails.filter((raw) => {
      if (!raw) return false;
      const [l, d] = raw.toLowerCase().split('@');
      return d === domain && l !== local && /^[a-z]+\d{3,}$/.test(l) && l.startsWith(prefix);
    }).length;

    if (clusterCount >= 2) {
      return {
        name: 'emailPattern',
        fired: true,
        score: 50,
        reason: `Email address follows a numeric-suffix pattern (${local}@${domain}) with ${clusterCount} similar addresses in the same dataset.`,
        evidence: { prefix, domain, clusterCount, type: 'numeric-suffix' },
        identifierTypesUsed: ['email'],
      };
    }
  }

  return {
    name: 'emailPattern',
    fired: false,
    score: 0,
    reason: 'No suspicious email patterns detected.',
    evidence: {},
  };
}

function addressClustering(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  if (!order.addressHash) {
    return {
      name: 'addressClustering',
      fired: false,
      score: 0,
      reason: 'No address hash available.',
      evidence: {},
    };
  }

  const distinctEmails = ctx.addressEmailMap.get(order.addressHash) ?? new Set();

  if (distinctEmails.size < 3) {
    return {
      name: 'addressClustering',
      fired: false,
      score: 0,
      reason: `Only ${distinctEmails.size} distinct email(s) share this address — below the clustering threshold.`,
      evidence: { distinctEmailCount: distinctEmails.size },
    };
  }

  const score = Math.min(80, 30 + 10 * (distinctEmails.size - 3));

  return {
    name: 'addressClustering',
    fired: true,
    score,
    reason: `${distinctEmails.size} distinct email addresses have placed orders to this shipping address — consistent with an organised returns fraud ring.`,
    evidence: { distinctEmailCount: distinctEmails.size, totalOrdersAtAddress: (ctx.customerOrderHistory.get(order.emailHash) ?? []).length },
    identifierTypesUsed: ['address'],
  };
}

function valueAnomaly(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const stats = ctx.customerValueStats.get(order.emailHash);

  if (!stats) {
    return {
      name: 'valueAnomaly',
      fired: false,
      score: 0,
      reason: 'Insufficient order history to detect value anomalies (need ≥5 orders).',
      evidence: { orderCount: (ctx.customerOrderHistory.get(order.emailHash) ?? []).length },
    };
  }

  const { mean, stddev } = stats;
  const threshold = mean + 3 * stddev;

  if (order.orderTotal <= threshold) {
    return {
      name: 'valueAnomaly',
      fired: false,
      score: 0,
      reason: `Order value £${order.orderTotal.toFixed(2)} is within the customer's normal range.`,
      evidence: { orderTotal: order.orderTotal, mean, stddev, threshold },
    };
  }

  const zscore = (order.orderTotal - mean) / stddev;
  // Score scales with magnitude: 3σ → ~40, 5σ → ~56, 10σ → ~80, capped at 95
  const score = Math.min(95, Math.max(20, Math.round(20 + zscore * 7.5)));

  return {
    name: 'valueAnomaly',
    fired: true,
    score,
    reason: `Order value £${order.orderTotal.toFixed(2)} is ${zscore.toFixed(1)} standard deviations above this customer's average order value of £${mean.toFixed(2)}.`,
    evidence: { orderTotal: order.orderTotal, mean, stddev, zscore, threshold, orderCount: (ctx.customerOrderHistory.get(order.emailHash) ?? []).length },
    identifierTypesUsed: ['email'],
  };
}

function paymentChurn(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const methods = ctx.customerPaymentMethods.get(order.emailHash) ?? new Set();

  if (methods.size < 4) {
    return {
      name: 'paymentChurn',
      fired: false,
      score: 0,
      reason: `Customer used ${methods.size} distinct payment method(s) in the last 90 days — below the threshold.`,
      evidence: { distinctMethodCount: methods.size, windowDays: 90 },
    };
  }

  return {
    name: 'paymentChurn',
    fired: true,
    score: 60,
    reason: `Customer used ${methods.size} distinct payment methods within a 90-day window, which is consistent with testing multiple stolen or compromised payment instruments.`,
    evidence: { distinctMethodCount: methods.size, windowDays: 90, recentOrderCount: (ctx.customerOrderHistory.get(order.emailHash) ?? []).length },
    identifierTypesUsed: ['email', 'payment'],
  };
}

function refundPattern(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  const rawEmail = normaliseEmail((order as NormalisedOrder & { _rawEmail?: string })._rawEmail);

  if (!rawEmail) {
    return {
      name: 'refundPattern',
      fired: false,
      score: 0,
      reason: 'No email available for refund pattern analysis.',
      evidence: {},
    };
  }

  const entityRecord = ctx.historicalEmailMap.get(rawEmail);
  
  // If no historical entity record exists, return 0 - no pattern to analyze
  if (!entityRecord) {
    return {
      name: 'refundPattern',
      fired: false,
      score: 0,
      reason: 'No historical refund data available for this customer.',
      evidence: {},
    };
  }

  let score = 0;
  const evidence: Record<string, unknown> = {};

  // Factor 1 — Refund frequency acceleration (40 points max)
  if (entityRecord.refund_timestamps && entityRecord.refund_timestamps.length >= 2) {
    const timestamps = entityRecord.refund_timestamps.map((ts: string) => new Date(ts)).sort((a, b) => a.getTime() - b.getTime());
    const intervals: number[] = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      const days = (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    if (intervals.length >= 2) {
      const avgInterval = intervals.slice(0, -1).reduce((a, b) => a + b, 0) / (intervals.length - 1);
      const latestInterval = intervals[intervals.length - 1];
      const accelerationRatio = avgInterval / latestInterval;

      if (accelerationRatio > 3) {
        score += 40;
        evidence.accelerationRatio = accelerationRatio;
      } else if (accelerationRatio > 2) {
        score += 25;
        evidence.accelerationRatio = accelerationRatio;
      } else if (accelerationRatio > 1.5) {
        score += 15;
        evidence.accelerationRatio = accelerationRatio;
      }
    }
  }

  // Factor 2 — Time from purchase to claim (30 points max)
  if (order.refundDate) {
    const daysToClaim = (order.refundDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysToClaim <= 1) {
      score += 30;
      evidence.daysToClaim = daysToClaim;
    } else if (daysToClaim <= 3) {
      score += 20;
      evidence.daysToClaim = daysToClaim;
    } else if (daysToClaim <= 7) {
      score += 10;
      evidence.daysToClaim = daysToClaim;
    }

    // Extra penalty if faster than historical fastest
    // Use != null so a real 0-day claim (instant refund) isn't treated as missing.
    if (entityRecord.fastest_claim_days != null && daysToClaim < entityRecord.fastest_claim_days) {
      score += 10;
      evidence.escalatingBehaviour = true;
    }
  }

  const fired = score > 0;
  return {
    name: 'refundPattern',
    fired,
    score: Math.min(100, score),
    reason: fired
      ? `Refund pattern analysis detected suspicious behaviour: ${Object.entries(evidence).map(([k, v]) => `${k}=${v}`).join(', ')}.`
      : 'No suspicious refund patterns detected.',
    evidence,
    identifierTypesUsed: fired ? ['email'] : [],
  };
}

function crossMerchant(order: NormalisedOrder, ctx: FastScoringContext): SignalResult {
  // §1.2 — Use customer_profiles-based cross-merchant signal when context is available.
  // Falls back to fraud_entities-based heuristic when no merchantId was supplied
  // (e.g., eval harness, unit tests without a live DB).
  if (ctx.crossMerchantProfiles !== undefined && ctx.requestingMerchantId) {
    return computeCrossMerchantSignal({
      normEmail:             normaliseEmail((order as NormalisedOrder & { _rawEmail?: string })._rawEmail),
      normIP:                normaliseIP((order as NormalisedOrder & { _rawIP?: string | null })._rawIP),
      normAddress:           normaliseAddress((order as NormalisedOrder & { _rawAddress?: string | null })._rawAddress),
      normCard:              normaliseCard((order as NormalisedOrder & { _rawCardLast4?: string | null })._rawCardLast4),
      requestingMerchantId:  ctx.requestingMerchantId,
      profiles:              ctx.crossMerchantProfiles,
      pendingAuditLogs:      ctx.pendingAuditLogs,
    });
  }

  // ── Legacy fallback using fraud_entities (no live DB / eval harness) ──
  const rawEmail = normaliseEmail((order as NormalisedOrder & { _rawEmail?: string })._rawEmail);
  const rawIP    = normaliseIP((order as NormalisedOrder & { _rawIP?: string | null })._rawIP);

  let score = 0;
  const evidence: Record<string, unknown> = {};

  if (rawEmail) {
    const emailRecord = ctx.historicalEmailMap.get(rawEmail);
    if (emailRecord && emailRecord.total_orders >= 3) {
      const rate = emailRecord.total_refund_claims / emailRecord.total_orders;
      if (rate > 0.5) { score += 40; evidence.emailRefundRate = rate; }
      else if (rate > 0.3) { score += 25; evidence.emailRefundRate = rate; }
      else if (rate > 0.15) { score += 10; evidence.emailRefundRate = rate; }
    }
  }

  if (rawIP) {
    const ipRecord = ctx.historicalIPMap.get(rawIP);
    if (ipRecord) {
      if (ipRecord.total_merchants >= 3) { score += 35; evidence.ipMerchantCount = ipRecord.total_merchants; }
      else if (ipRecord.total_merchants >= 2) { score += 20; evidence.ipMerchantCount = ipRecord.total_merchants; }
      if (ipRecord.flagged_count >= 2) { score += 15; evidence.ipFlaggedCount = ipRecord.flagged_count; }
    }
  }

  if (rawIP) {
    const ipCoOccurrences = ctx.historicalCoOccurrenceMap?.get(`ip:${rawIP}`) ?? [];
    const suspiciousLinks = ipCoOccurrences.filter((co) => {
      const otherValue = co.entity_a_type === 'ip' ? co.entity_b_value : co.entity_a_value;
      const related = ctx.historicalEmailMap.get(otherValue);
      return related && related.flagged_count >= 2;
    });
    if (suspiciousLinks.length >= 2) { score += 25; evidence.suspiciousIPLinks = suspiciousLinks.length; }
    else if (suspiciousLinks.length === 1) { score += 12; evidence.suspiciousIPLinks = 1; }
  }

  const legacyFired = score > 0;
  // Determine identifier types used in legacy path
  const legacyTypes: string[] = [];
  if (legacyFired) {
    if (evidence.emailRefundRate !== undefined) legacyTypes.push('email');
    if (evidence.ipMerchantCount !== undefined || evidence.suspiciousIPLinks !== undefined) legacyTypes.push('ip');
  }

  return {
    name: 'crossMerchant',
    fired: legacyFired,
    score: Math.min(100, score),
    reason: legacyFired
      ? `Cross-merchant intelligence flagged this customer: ${Object.entries(evidence).map(([k, v]) => `${k}=${v}`).join(', ')}.`
      : 'No cross-merchant fraud signals detected.',
    evidence,
    identifierTypesUsed: legacyTypes,
  };
}

// ---------------------------------------------------------------------------
// Scoring orchestration
// ---------------------------------------------------------------------------

function computeScore(signals: SignalResult[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.name as keyof typeof SIGNAL_WEIGHTS];
    if (weight === undefined) continue;
    // Only include weight for signals that actually fired.
    // Including unfired signals in the denominator dilutes the score and causes
    // real fraud patterns to fall below the flagging threshold.
    if (!signal.fired) continue;
    weightedSum += signal.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.min(100, Math.max(0, weightedSum / totalWeight));
}

function getRiskTier(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_TIER_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_TIER_THRESHOLDS.high) return 'high';
  if (score >= RISK_TIER_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Apply adaptive signal weight adjustments learned from merchant feedback.
 * Multiplier is clamped to [0, 2] per the constraints.
 */
function applyAdjustment(signal: SignalResult, ctx: FastScoringContext): SignalResult {
  const adj = ctx.signalWeightAdjustments?.[signal.name] ?? 0;
  if (adj === 0) return signal;
  const multiplier = Math.max(0, Math.min(2, 1 + adj));
  return { ...signal, score: Math.min(100, Math.max(0, signal.score * multiplier)) };
}

/**
 * Score a batch of orders using a pre-built FastScoringContext and a
 * pre-built IdentityClusterMap. Both MUST be supplied — the cluster map is
 * built in the worker so it can also be persisted to fraud_identity_clusters.
 */
export function scoreBatch(
  orders: NormalisedOrder[],
  ctx: FastScoringContext,
  identityClusterMap: IdentityClusterMap
): ScoredOrder[] {
  return orders.map((order) => {
    const rawSignals = [
      refundRate(order, ctx),
      inrAbuse(order, ctx),
      velocity(order, ctx),
      inrSpeed(order),
      emailPattern(order, ctx),
      addressClustering(order, ctx),
      valueAnomaly(order, ctx),
      paymentChurn(order, ctx),
      refundPattern(order, ctx),
      crossMerchant(order, ctx),
    ];

    const signals = rawSignals.map((s) => applyAdjustment(s, ctx));

    const totalScore = computeScore(signals);
    const riskTier = getRiskTier(totalScore);
    const flagged = totalScore >= FLAG_THRESHOLD;

    // §5.1 — Data completeness cap
    // A 'definite' grade requires at least 2 distinct strong identifier types.
    // IP is NOT a strong identifier type for this purpose.
    const strongIdentifierTypes = new Set<string>();
    for (const signal of signals) {
      if (signal.fired && signal.identifierTypesUsed) {
        for (const type of signal.identifierTypesUsed) {
          if (type !== 'ip') strongIdentifierTypes.add(type);
        }
      }
    }
    const strongCount = strongIdentifierTypes.size;

    let confidenceGrade: ConfidenceGrade | null;
    if (totalScore >= 75 && strongCount >= 2) {
      confidenceGrade = 'definite';
    } else if (totalScore >= 75 && strongCount === 1) {
      confidenceGrade = 'probable'; // single-identifier cap
    } else if (totalScore >= 50 && strongCount >= 2) {
      confidenceGrade = 'probable';
    } else if (totalScore >= 25 && strongCount >= 1) {
      confidenceGrade = 'possible';
    } else if (totalScore >= 25 && strongCount === 0) {
      confidenceGrade = 'weak'; // IP-only or no identifiers
    } else {
      confidenceGrade = null; // below scoring threshold
    }

    // §5.2 — IP-only clustering guard
    // If all fired signals are IP-derived (no email, address, phone, payment,
    // device signals), downgrade to 'weak' regardless of score.
    const hasNonIpSignal = signals.some(
      (s) => s.fired && s.identifierTypesUsed && s.identifierTypesUsed.some((t) => t !== 'ip')
    );
    if (!hasNonIpSignal && confidenceGrade !== null) {
      confidenceGrade = 'weak';
    }

    const cluster = identityClusterMap[order.orderId] || null;
    const identityAlerts = generateIdentityAlert(order, cluster, ctx);

    return {
      order,
      totalScore,
      riskTier,
      confidenceGrade,
      flagged,
      signals,
      identityAlerts,
    };
  });
}
