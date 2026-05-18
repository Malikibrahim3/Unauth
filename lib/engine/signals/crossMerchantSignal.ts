import type { Signal, SignalResult, NormalisedOrder, ScoringContext } from '../types';
import { computeCrossMerchantSignal } from './crossMerchant';

interface WithRaw {
  _rawEmail?: string;
  _rawIP?: string | null;
  _rawAddress?: string | null;
  _rawCardLast4?: string | null;
}

export const crossMerchant: Signal = (
  order: NormalisedOrder,
  context: ScoringContext,
): SignalResult => {
  const profiles = context.crossMerchantProfiles;
  const requestingMerchantId = context.requestingMerchantId;
  if (!profiles || !requestingMerchantId) {
    return {
      name: 'crossMerchant',
      fired: false,
      score: 0,
      reason: 'Cross-merchant context not provided (eval mode without profiles or production without merchantId).',
      evidence: {},
      identifierTypesUsed: [],
    };
  }
  const o = order as NormalisedOrder & WithRaw;
  const normEmail = o._rawEmail ? o._rawEmail.toLowerCase().trim() : null;
  const result = computeCrossMerchantSignal({
    normEmail,
    normIP: o._rawIP ?? null,
    normAddress: o._rawAddress ?? null,
    normCard: o._rawCardLast4 ?? null,
    requestingMerchantId,
    profiles,
    pendingAuditLogs: context.pendingAuditLogs ?? [],
  });

  // Quality gate — added by Fix 2: do not fire when network evidence is weak
  // (e.g. coincidental IP-collision matches). The base signal floor of score
  // 30 — applied to every matching profile, including 1-order/0-refund
  // matches — pulls down the weighted average for already-flagged fraudsters
  // who happen to share an identifier with an unrelated other-merchant order.
  // Require either >= 3 network orders OR >= 20% network refund rate to fire.
  // Note: this guard lives in the wrapper, not in the underlying
  // computeCrossMerchantSignal, so the production signal's behaviour is
  // unchanged for deployments with proper k-anonymity.
  if (result.fired) {
    const ev = result.evidence as { networkOrders?: number; inrRate?: number };
    const networkOrders = ev.networkOrders ?? 0;
    const inrRate = ev.inrRate ?? 0;
    if (networkOrders < 3 && inrRate < 0.20) {
      return {
        name: 'crossMerchant',
        fired: false,
        score: 0,
        reason: `Cross-merchant match found but evidence too weak to act on (${networkOrders} network orders, ${(inrRate * 100).toFixed(0)}% refund rate). Likely a coincidental identifier collision.`,
        evidence: ev,
        identifierTypesUsed: [],
      };
    }
  }
  return result;
};
