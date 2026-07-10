import { labelFor } from './labels';

export interface SignalCopy {
  title: string;
  short: string;
  /** Context-only note for merchant review — not an operational instruction. */
  contextNote: string;
  explanation: string;
  badge?: string;
}

const DEFAULT_SIGNAL_COPY: SignalCopy = {
  title: 'Context signal',
  short: 'Context signal',
  contextNote: 'Useful context for merchant review alongside the case record.',
  explanation: 'This order shares characteristics that may be relevant when reviewing the case.',
};

export const SIGNAL_COPY: Record<string, SignalCopy> = {
  inrSpeed: {
    title: "'Not received' claim filed unusually quickly after delivery",
    short: "Fast 'not received' claim",
    contextNote: "The claim timing is unusually fast and should be read alongside fulfilment evidence.",
    explanation: "The customer filed a 'not received' claim sooner than expected after delivery.",
  },
  inrAbuse: {
    title: "Repeated 'item not received' claims across orders",
    short: "Repeated 'not received' claims",
    contextNote: 'Review alongside prior claim history and delivery context for this case.',
    explanation: "The account shows a repeat pattern of 'item not received' claims.",
  },
  refundRate: {
    title: 'Refund rate significantly above typical customer baseline',
    short: 'High refund claim rate',
    contextNote: 'Refund rate is above this customer’s usual baseline — useful context for merchant review.',
    explanation: 'This customer claims refunds more often than their typical order history suggests.',
  },
  velocity: {
    title: 'Unusual concentration of orders within a short window',
    short: 'Concentrated order burst',
    contextNote: 'The recent order burst is unusual enough to inspect the latest orders together.',
    explanation: 'Several orders were placed in a short period, which can indicate unusual activity.',
  },
  addressClustering: {
    title: 'Delivery address shared across multiple separate accounts',
    short: 'Shared delivery address signal',
    contextNote: 'Shared delivery evidence can help explain whether the linked accounts are related.',
    explanation: 'The same delivery address appears across multiple account identities.',
  },
  emailPattern: {
    title: 'Email address pattern suggests disposable or aliased account',
    short: 'Disposable or aliased email pattern',
    contextNote: 'The email pattern is weak alone, but useful as context beside stronger identifiers.',
    explanation: 'The email pattern looks temporary or intentionally varied.',
  },
  paymentChurn: {
    title: 'Multiple different payment methods used in a short window',
    short: 'Multiple payment methods',
    contextNote: 'Payment changes should be interpreted with the linked-account timeline.',
    explanation: 'The customer switched payment methods repeatedly in a short time.',
  },
  valueAnomaly: {
    title: "Order value significantly above this customer's historical baseline",
    short: 'Unusually high order value',
    contextNote: 'The order value is unusually high relative to the customer baseline.',
    explanation: "This order is much higher in value than the customer's usual pattern.",
  },
  refundPattern: {
    title: 'Refund claim pattern matches previously seen repeated claim profiles',
    short: 'Repeated claim pattern match',
    contextNote: 'Repeated claim pattern on this profile — review with other available data points.',
    explanation: 'The claim pattern resembles prior repeated-claim behaviour.',
  },
  crossMerchantSignal: {
    title: 'Linked account activity in this store',
    short: 'Linked store account',
    badge: 'Store account link',
    contextNote: 'This store has customer records that share identity signals.',
    explanation: 'Multiple customer records in this store share identity details.',
  },
  networkDeviceLink: {
    title: 'Device pattern linked within this store',
    short: 'Store device link',
    badge: 'Store device link',
    contextNote: 'The device pattern supports the linked activity in this store.',
    explanation: 'A device-level signal connects activity recorded by this store.',
  },
  ipCluster: {
    title: 'IP pattern shared across linked activity',
    short: 'IP cluster',
    badge: 'IP cluster',
    contextNote: 'The IP pattern is contextual evidence beside stronger identity signals.',
    explanation: 'The IP pattern appears across linked order activity.',
  },

  shared_email: {
    title: 'Shared email address across linked activity',
    short: 'Shared email address',
    badge: 'Shared email address',
    contextNote: 'The shared email is a direct identity link across the displayed order activity.',
    explanation: 'The same email address appears across linked order activity.',
  },
  shared_phone: {
    title: 'Shared phone number across linked activity',
    short: 'Shared phone number',
    badge: 'Shared phone number',
    contextNote: 'The shared phone number connects the displayed order activity.',
    explanation: 'The same phone number appears across linked order activity.',
  },
  shared_address: {
    title: 'Shared delivery address across linked activity',
    short: 'Shared delivery address',
    badge: 'Shared delivery address',
    contextNote: 'The shared delivery address connects the displayed order activity.',
    explanation: 'The same delivery address appears across linked order activity.',
  },
  shared_card: {
    title: 'Shared payment card across linked activity',
    short: 'Shared payment card',
    badge: 'Shared payment card',
    contextNote: 'The shared payment card is strong identity evidence across linked orders.',
    explanation: 'The same payment card appears across linked order activity.',
  },
  shared_account_id: {
    title: 'Shared account identifier across linked activity',
    short: 'Shared account',
    badge: 'Shared account',
    contextNote: 'The shared account identifier is strong identity evidence across linked activity.',
    explanation: 'The same underlying account identifier appears across linked activity.',
  },
  shared_ip: {
    title: 'Shared IP address across linked activity',
    short: 'Shared IP address',
    badge: 'Shared IP address',
    contextNote: 'The shared IP is contextual evidence and should be read with stronger identifiers.',
    explanation: 'The same IP address appears across linked order activity.',
  },
  shared_device: {
    title: 'Shared device across linked activity',
    short: 'Shared device',
    badge: 'Shared device',
    contextNote: 'The shared device is strong identity evidence across linked orders.',
    explanation: 'The same device appears across linked order activity.',
  },
  refund_velocity: {
    title: 'Refund claims are arriving unusually quickly',
    short: 'Fast repeat claims',
    badge: 'Fast repeat claims',
    contextNote: 'The recent claim timeline is faster than expected.',
    explanation: 'Claims are being filed faster than expected after ordering or delivery.',
  },
  chargeback_after_delivery: {
    title: 'Chargeback was filed after delivery evidence was recorded',
    short: 'Chargeback after delivery',
    badge: 'Chargeback after delivery',
    contextNote: 'Delivery evidence is present and relevant to the chargeback timeline.',
    explanation: 'A chargeback was filed even though delivery evidence exists.',
  },
  item_not_received_repeat: {
    title: "Repeated 'item not received' claims were detected",
    short: "Repeated 'item not received' claims",
    badge: "Repeated 'item not received' claims",
    contextNote: "Prior 'item not received' claims are relevant to this profile.",
    explanation: "The account has repeated 'item not received' claims across orders.",
  },
  address_mismatch: {
    title: 'Address details vary across linked order activity',
    short: 'Address mismatch',
    badge: 'Address mismatch',
    contextNote: 'Address changes are visible across linked orders and may need context.',
    explanation: 'The address details differ across linked orders.',
  },
  name_variant: {
    title: 'Name details vary across linked order activity',
    short: 'Name variation',
    badge: 'Name variation',
    contextNote: 'Name variation is visible across linked orders.',
    explanation: 'Different name variants appear across linked orders.',
  },
  behavioral_anomaly: {
    title: 'Order behaviour differs from the usual pattern',
    short: 'Unusual order behaviour',
    badge: 'Unusual order behaviour',
    contextNote: 'The order pattern differs from this profile baseline.',
    explanation: 'The order pattern differs from typical behaviour for this profile.',
  },
  postDeliveryClaimRate: {
    title: 'Refund or INR claims filed after orders were marked delivered',
    short: 'Repeat post-delivery claims',
    badge: 'Post-delivery claim pattern',
    contextNote: 'The customer files refund or INR claims after orders are confirmed delivered, at an elevated rate.',
    explanation: 'Claims are being filed after delivery confirmation on multiple orders.',
  },
  billingAddressClustering: {
    title: 'Billing address shared across multiple accounts via dispute history',
    short: 'Shared billing address cluster',
    badge: 'Billing address cluster',
    contextNote: 'Multiple emails are linked through a shared billing address in dispute history.',
    explanation: 'Multiple account identities share a billing address through payment dispute records.',
  },
  addressMismatch: {
    title: 'Billing and shipping address do not match',
    short: 'Billing/shipping address mismatch',
    badge: 'Address mismatch',
    contextNote: 'A billing-to-shipping address mismatch adds supporting context.',
    explanation: 'The billing and delivery addresses on this order differ.',
  },
  disputeHistory: {
    title: 'Prior disputes, refund requests, or return requests detected',
    short: 'Prior dispute history',
    badge: 'Dispute history',
    contextNote: 'Documented dispute history is relevant to this claim.',
    explanation: 'This profile has a prior history of disputes, refund requests, or returns.',
  },
  crossMerchant: {
    title: 'Cross-network refund or INR history (privacy-safe)',
    short: 'Seen at multiple merchants',
    badge: 'Cross-merchant signal',
    contextNote: 'This identity appears in other merchants’ data in the network with a minimum group size for privacy.',
    explanation: 'This identity has refund or INR signals that appear across the wider merchant network.',
  },
};

export function signalCopy(name: string): SignalCopy {
  const copy = SIGNAL_COPY[name];
  if (copy) return copy;

  const fallback = labelFor(name);
  return {
    ...DEFAULT_SIGNAL_COPY,
    title: fallback,
    short: fallback,
    explanation: `${fallback} was detected and is visible as supporting context.`,
    badge: fallback,
  };
}
