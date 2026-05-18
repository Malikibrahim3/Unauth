import type { Signal, SignalResult, NormalisedOrder, ScoringContext } from '../types';

/**
 * Network-device-link signal.
 *
 * Built by Fix 5. Targets Cohort 5 Sub-A (first-order fraudsters who share a
 * device_ip or browser_fingerprint with a previously-flagged fraudster cluster
 * elsewhere in the network). The engine previously had no way to elevate a
 * single-order customer based on shared hardware identifiers.
 *
 * Two-name emission so the engine's corroboration penalty can correctly
 * discriminate two cases:
 *
 *   networkDeviceLink       — registered as BROAD overlap in lib/engine/index.ts.
 *                             Score 35-65 when ip and/or fingerprint matches a
 *                             flagged identifier but the current order is otherwise
 *                             clean. Penalty (0.45×) suppresses it on innocent
 *                             customers who happen to be on the same building IP
 *                             or coffee-shop wifi as a fraudster (Cohort 7 Sub-B).
 *
 *   networkDeviceLinkActive — registered as STRONG fraud evidence. Score 75 when
 *                             device match AND the current order itself carries a
 *                             refund/chargeback flag. The presence of both
 *                             "shares device with known fraudster" AND "is itself
 *                             claiming a refund" is the actionable signal —
 *                             this is the Cohort 5A pattern.
 *
 * Anti-cheating note: the `networkFraudsterIdentifiers` set is populated in
 * the eval harness from the engine's OWN pass-1 flagged orders, NOT from the
 * ground-truth labels. See runEval.ts buildNetworkFraudsterIdentifiers().
 */

interface WithRaw {
  _rawIP?: string | null;
}

export const networkDeviceLink: Signal = (
  order: NormalisedOrder,
  context: ScoringContext,
): SignalResult => {
  const known = context.networkFraudsterIdentifiers;
  if (!known || known.size === 0) {
    return {
      name: 'networkDeviceLink',
      fired: false,
      score: 0,
      reason: 'No network fraudster identifiers loaded (first pass or empty consortium).',
      evidence: {},
      identifierTypesUsed: [],
    };
  }
  const o = order as NormalisedOrder & WithRaw;
  const ip = o._rawIP ?? null;
  const fp = order.browserFingerprint ?? null;
  const ipMatch = ip ? known.has(`ip:${ip}`) : false;
  // browserFingerprint is hashed at normalise time; the runEval pre-pass
  // populates the set with these same hashes so direct lookup works.
  const fpMatch = fp ? known.has(`fp:${fp}`) : false;
  if (!ipMatch && !fpMatch) {
    return {
      name: 'networkDeviceLink',
      fired: false,
      score: 0,
      reason: 'No device-level match against any previously-flagged identifier.',
      evidence: { ipMatch: false, fpMatch: false },
      identifierTypesUsed: [],
    };
  }

  // Score per the brief: ip = 50, fp = 45, both = 65.
  let score: number;
  if (ipMatch && fpMatch) score = 65;
  else if (ipMatch) score = 50;
  else score = 45;

  // Discriminator: if the current order itself carries a refund/chargeback
  // flag, elevate to the "Active" variant (strong evidence, no penalty).
  // Otherwise emit as broad-overlap.
  const currentOrderActive =
    order.chargebackDispute === true ||
    order.refundRequested === true ||
    order.refundStatus === 'full' ||
    order.refundStatus === 'partial' ||
    order.orderStatus === 'refunded';

  if (currentOrderActive) {
    // Active variant: cap higher because both halves of the signal are present.
    const activeScore = ipMatch && fpMatch ? 90 : 75;
    const matchType = ipMatch && fpMatch ? 'IP and browser fingerprint' : ipMatch ? 'IP' : 'browser fingerprint';
    return {
      name: 'networkDeviceLinkActive',
      fired: true,
      score: activeScore,
      reason: `Order shares ${matchType} with a previously-flagged fraudster identity AND is itself claiming a refund or chargeback.`,
      evidence: { ipMatch, fpMatch, currentOrderActive: true },
      identifierTypesUsed: [ipMatch ? 'ip' : '', fpMatch ? 'device' : ''].filter(Boolean),
    };
  }

  return {
    name: 'networkDeviceLink',
    fired: true,
    score,
    reason: `Order shares ${ipMatch && fpMatch ? 'both IP and browser fingerprint' : ipMatch ? 'IP' : 'browser fingerprint'} with a previously-flagged fraudster identity, but the order itself shows no refund or chargeback — broad-overlap signal only.`,
    evidence: { ipMatch, fpMatch, currentOrderActive: false },
    identifierTypesUsed: [ipMatch ? 'ip' : '', fpMatch ? 'device' : ''].filter(Boolean),
  };
};
