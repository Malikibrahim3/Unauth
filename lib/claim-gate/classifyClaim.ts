import type { ClaimTypeValue } from '@/lib/claims/claimTypes';
import type { ClaimGateClaimType } from '@/lib/claim-gate/types';

export async function classifyClaim(
  claimText: string,
  requestedAction?: string | null,
): Promise<ClaimGateClaimType> {
  const text = `${claimText} ${requestedAction ?? ''}`.toLowerCase();

  const deliveredNotReceivedPatterns = [
    'says delivered',
    'marked delivered',
    'tracking says delivered',
    'delivered but',
    'never received',
    'did not receive',
    "didn't receive",
    'not received',
    'not arrived',
    'never arrived',
  ];

  if (deliveredNotReceivedPatterns.some((pattern) => text.includes(pattern)) && text.includes('delivered')) {
    return 'DELIVERED_NOT_RECEIVED';
  }
  if (text.includes('refund') && (text.includes('shipped') || text.includes('dispatched'))) {
    return 'REFUND_AFTER_SHIPMENT';
  }
  if (text.includes('damaged') || text.includes('broken')) return 'DAMAGED_ITEM';
  if (text.includes('missing item') || text.includes('item missing')) return 'MISSING_ITEM';
  if (text.includes('wrong item') || text.includes('incorrect item')) return 'WRONG_ITEM';
  if (text.includes('return') && text.includes('exception')) return 'RETURN_EXCEPTION';
  if (text.includes('not received') || text.includes('never arrived') || text.includes('missing package')) {
    return 'ITEM_NOT_RECEIVED';
  }
  return 'UNKNOWN';
}

export function claimGateTypeToStoredClaimType(type: ClaimGateClaimType): ClaimTypeValue {
  switch (type) {
    case 'DELIVERED_NOT_RECEIVED':
    case 'ITEM_NOT_RECEIVED':
      return 'item_not_received';
    case 'REFUND_AFTER_SHIPMENT':
      return 'refund_request';
    case 'DAMAGED_ITEM':
      return 'damaged';
    case 'WRONG_ITEM':
      return 'wrong_item';
    case 'MISSING_ITEM':
      return 'not_as_described';
    case 'RETURN_EXCEPTION':
      return 'return_abuse';
    case 'UNKNOWN':
    default:
      return 'other';
  }
}

