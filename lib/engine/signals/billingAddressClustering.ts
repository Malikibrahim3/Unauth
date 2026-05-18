import type { Signal, SignalResult, NormalisedOrder, ScoringContext } from '../types';

/**
 * Billing-address clustering signal.
 *
 * Built by Fix 4. The diagnostic for Cohort 1 Sub-C (serial INR claimers who
 * rotate email, card, phone, name, AND shipping address but cannot change
 * their real home address) showed that 25 of 25 clusters were missed —
 * 108 orders, avg score 15.7. The engine had `billingAddressHash` computed
 * by normaliseRow but no signal consumed it.
 *
 * Logic per the tuning brief:
 *   - look at PRIOR orders (orderDate strictly less) that share the same
 *     billing-address hash
 *   - if ≥2 prior orders carry an explicit chargeback flag → score 45
 *   - if ≥3 prior orders carry a refund flag → score 35
 *   - otherwise: not fired
 *
 * This signal is registered as "broad overlap" in lib/engine/index.ts so the
 * corroboration penalty (×0.45) suppresses the score for innocent customers
 * who happen to live at the same address as a fraudster but have no fraud
 * signals of their own (Cohort 7 Sub-A).
 */
export const billingAddressClustering: Signal = (
  order: NormalisedOrder,
  context: ScoringContext,
): SignalResult => {
  if (!order.billingAddressHash) {
    return {
      name: 'billingAddressClustering',
      fired: false,
      score: 0,
      reason: 'No billing address provided on this order.',
      evidence: {},
      identifierTypesUsed: [],
    };
  }
  const targetHash = order.billingAddressHash;
  const targetTime = order.orderDate.getTime();
  let priorChargebacks = 0;
  let priorRefunds = 0;
  let priorOrders = 0;
  const distinctEmails = new Set<string>();
  for (const o of context.allOrders) {
    if (o.orderId === order.orderId) continue;
    if (o.billingAddressHash !== targetHash) continue;
    if (o.orderDate.getTime() >= targetTime) continue;
    priorOrders++;
    distinctEmails.add(o.emailHash);
    if (o.chargebackDispute === true) priorChargebacks++;
    const hadRefund =
      o.refundRequested === true ||
      o.refundStatus === 'full' ||
      o.refundStatus === 'partial' ||
      o.orderStatus === 'refunded';
    if (hadRefund) priorRefunds++;
  }
  if (priorChargebacks >= 2) {
    return {
      name: 'billingAddressClustering',
      fired: true,
      score: 45,
      reason: `${priorChargebacks} prior chargebacks at this billing address across ${distinctEmails.size} distinct customer emails — possible billing-address-anchored serial fraud.`,
      evidence: {
        priorOrdersAtBillingAddress: priorOrders,
        priorChargebacks,
        priorRefunds,
        distinctEmailCount: distinctEmails.size,
      },
      identifierTypesUsed: ['address'],
    };
  }
  if (priorRefunds >= 3) {
    return {
      name: 'billingAddressClustering',
      fired: true,
      score: 35,
      reason: `${priorRefunds} prior refunds at this billing address across ${distinctEmails.size} distinct customer emails — suggests billing-address-anchored refund abuse.`,
      evidence: {
        priorOrdersAtBillingAddress: priorOrders,
        priorChargebacks,
        priorRefunds,
        distinctEmailCount: distinctEmails.size,
      },
      identifierTypesUsed: ['address'],
    };
  }
  return {
    name: 'billingAddressClustering',
    fired: false,
    score: 0,
    reason: priorOrders === 0
      ? 'No prior orders share this billing address.'
      : `${priorOrders} prior orders at this billing address but below dispute threshold (need ≥3 refunds or ≥2 chargebacks).`,
    evidence: { priorOrdersAtBillingAddress: priorOrders, priorChargebacks, priorRefunds },
    identifierTypesUsed: [],
  };
};
