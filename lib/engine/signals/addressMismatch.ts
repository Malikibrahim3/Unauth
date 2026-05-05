import type { NormalisedOrder, Signal, SignalResult } from '../types';

// §2 — Billing / shipping address mismatch.
//
// Cheap baseline rule used industry-wide. Not a fraud determinant on its own
// (gifts, business orders, parents buying for kids all legitimately mismatch),
// but a well-calibrated corroborating signal when combined with anything else.
// Mirrors lib/engine/fastScore.ts#addressMismatch.
export const addressMismatch: Signal = (order: NormalisedOrder): SignalResult => {
  if (!order.addressHash || !order.billingAddressHash) {
    return {
      name: 'addressMismatch',
      fired: false,
      score: 0,
      reason: 'Billing or shipping address missing — cannot compare.',
      evidence: {},
    };
  }
  if (order.addressHash === order.billingAddressHash) {
    return {
      name: 'addressMismatch',
      fired: false,
      score: 0,
      reason: 'Billing and shipping addresses match.',
      evidence: {},
    };
  }
  return {
    name: 'addressMismatch',
    fired: true,
    score: 35,
    reason: 'Billing address does not match shipping address — commonly associated with card-not-present fraud when corroborated by other signals.',
    evidence: { match: false },
  };
};
