/**
 * lib/payouts/requestedAction.ts
 *
 * Reconciles the customer-requested action(s) for a case. `requested_action` is a
 * separate axis from `claim_type` (what went wrong vs. what to do about it).
 * Resolutions like reship/replacement/discount/store_credit live here, never in
 * the claim-type vocabulary. Pure; explainable.
 */
import {
  REQUESTED_ACTION_BY_CLAIM_TYPE,
  RETURN_REQUIRED_BY_CLAIM_TYPE,
} from '@/lib/payouts/config';
import {
  REQUESTED_ACTION_LABELS,
  type PayoutClaimType,
  type RequestedAction,
  type RequestedActionResult,
} from '@/lib/payouts/types';

export function reconcileRequestedActions(args: {
  claimType: PayoutClaimType | null;
  requestedActions?: RequestedAction[] | null;
  returnRequired?: boolean | null;
}): RequestedActionResult {
  const { claimType, requestedActions, returnRequired } = args;
  const reasons: string[] = [];

  let requested: RequestedAction[];
  if (requestedActions && requestedActions.length > 0) {
    // De-duplicate while preserving order.
    requested = requestedActions.filter((a, i) => requestedActions.indexOf(a) === i);
    reasons.push('Using the customer-requested action(s) provided on the case');
  } else if (claimType) {
    const inferred = REQUESTED_ACTION_BY_CLAIM_TYPE[claimType] ?? 'unknown';
    requested = [inferred];
    reasons.push(
      inferred === 'unknown'
        ? 'No requested action supplied and none could be inferred from the claim type'
        : `No requested action supplied — inferred "${REQUESTED_ACTION_LABELS[inferred]}" from the claim type`,
    );
  } else {
    requested = ['unknown'];
    reasons.push('No requested action and no claim type available');
  }

  const primary = requested[0] ?? 'unknown';

  let resolvedReturnRequired: boolean | null;
  if (typeof returnRequired === 'boolean') {
    resolvedReturnRequired = returnRequired;
    reasons.push(returnRequired ? 'Return is required for this case' : 'No return required (returnless)');
  } else if (claimType) {
    resolvedReturnRequired = RETURN_REQUIRED_BY_CLAIM_TYPE[claimType] ?? null;
  } else {
    resolvedReturnRequired = null;
  }

  return {
    primary,
    requested,
    returnRequired: resolvedReturnRequired,
    reasons,
  };
}
