import { labelFor } from './labels';

export interface SignalCopy {
  title: string;
  short: string;
  recommended: string;
  explanation: string;
  badge?: string;
}

const DEFAULT_SIGNAL_COPY: SignalCopy = {
  title: 'Review reason',
  short: 'Review reason',
  recommended: 'Review this order manually',
  explanation: 'This order shares characteristics that merit manual review.',
};

export const SIGNAL_COPY: Record<string, SignalCopy> = {
  inrSpeed: {
    title: "'Not received' claim filed unusually quickly after delivery",
    short: "Fast 'not received' claim",
    recommended: 'Review this refund manually before approving',
    explanation: "The customer filed a 'not received' claim sooner than expected after delivery.",
  },
  inrAbuse: {
    title: "Repeated 'item not received' claims across orders",
    short: "Repeated 'not received' claims",
    recommended: 'Hold any pending refund and request additional verification',
    explanation: "The account shows a repeat pattern of 'item not received' claims.",
  },
  refundRate: {
    title: 'Refund rate significantly above typical customer baseline',
    short: 'High refund claim rate',
    recommended: 'Add to review list and review next order manually',
    explanation: 'This customer claims refunds more often than their typical order history suggests.',
  },
  velocity: {
    title: 'Unusual concentration of orders within a short window',
    short: 'Concentrated order burst',
    recommended: 'Manually review the most recent orders',
    explanation: 'Several orders were placed in a short period, which can indicate unusual activity.',
  },
  addressClustering: {
    title: 'Delivery address shared across multiple separate accounts',
    short: 'Shared delivery address signal',
    recommended: 'Compare delivery evidence across linked orders',
    explanation: 'The same delivery address appears across multiple account identities.',
  },
  emailPattern: {
    title: 'Email address pattern suggests disposable or aliased account',
    short: 'Disposable or aliased email pattern',
    recommended: 'Request additional verification before future refunds',
    explanation: 'The email pattern looks temporary or intentionally varied.',
  },
  paymentChurn: {
    title: 'Multiple different payment methods used in a short window',
    short: 'Multiple payment methods',
    recommended: 'Review payment history across linked accounts',
    explanation: 'The customer switched payment methods repeatedly in a short time.',
  },
  valueAnomaly: {
    title: "Order value significantly above this customer's historical baseline",
    short: 'Unusually high order value',
    recommended: 'Manually verify before fulfilling',
    explanation: "This order is much higher in value than the customer's usual pattern.",
  },
  refundPattern: {
    title: 'Refund claim pattern matches previously seen repeated claim profiles',
    short: 'Repeated claim pattern match',
    recommended: 'Add to review list and require manual approval',
    explanation: 'The claim pattern resembles prior repeated-claim behaviour.',
  },

  shared_email: {
    title: 'Shared email address across linked activity',
    short: 'Shared email address',
    badge: 'Shared email address',
    recommended: 'Compare account details across linked orders',
    explanation: 'The same email address appears across linked order activity.',
  },
  shared_phone: {
    title: 'Shared phone number across linked activity',
    short: 'Shared phone number',
    badge: 'Shared phone number',
    recommended: 'Compare account details across linked orders',
    explanation: 'The same phone number appears across linked order activity.',
  },
  shared_address: {
    title: 'Shared delivery address across linked activity',
    short: 'Shared delivery address',
    badge: 'Shared delivery address',
    recommended: 'Compare delivery details across linked orders',
    explanation: 'The same delivery address appears across linked order activity.',
  },
  shared_card: {
    title: 'Shared payment card across linked activity',
    short: 'Shared payment card',
    badge: 'Shared payment card',
    recommended: 'Review payment history across linked orders',
    explanation: 'The same payment card appears across linked order activity.',
  },
  shared_account_id: {
    title: 'Shared account identifier across linked activity',
    short: 'Shared account',
    badge: 'Shared account',
    recommended: 'Review the linked account history',
    explanation: 'The same underlying account identifier appears across linked activity.',
  },
  shared_ip: {
    title: 'Shared IP address across linked activity',
    short: 'Shared IP address',
    badge: 'Shared IP address',
    recommended: 'Compare recent orders from the same location',
    explanation: 'The same IP address appears across linked order activity.',
  },
  shared_device: {
    title: 'Shared device across linked activity',
    short: 'Shared device',
    badge: 'Shared device',
    recommended: 'Compare device-linked orders before approving refunds',
    explanation: 'The same device appears across linked order activity.',
  },
  refund_velocity: {
    title: 'Refund claims are arriving unusually quickly',
    short: 'Fast repeat claims',
    badge: 'Fast repeat claims',
    recommended: 'Review the recent claim timeline manually',
    explanation: 'Claims are being filed faster than expected after ordering or delivery.',
  },
  chargeback_after_delivery: {
    title: 'Chargeback was filed after delivery evidence was recorded',
    short: 'Chargeback after delivery',
    badge: 'Chargeback after delivery',
    recommended: 'Compare delivery evidence before responding',
    explanation: 'A chargeback was filed even though delivery evidence exists.',
  },
  item_not_received_repeat: {
    title: "Repeated 'item not received' claims were detected",
    short: "Repeated 'item not received' claims",
    badge: "Repeated 'item not received' claims",
    recommended: 'Review prior claims before approving another refund',
    explanation: "The account has repeated 'item not received' claims across orders.",
  },
  address_mismatch: {
    title: 'Address details vary across linked order activity',
    short: 'Address mismatch',
    badge: 'Address mismatch',
    recommended: 'Check whether address changes have a legitimate explanation',
    explanation: 'The address details differ across linked orders.',
  },
  name_variant: {
    title: 'Name details vary across linked order activity',
    short: 'Name variation',
    badge: 'Name variation',
    recommended: 'Compare the name used across linked orders',
    explanation: 'Different name variants appear across linked orders.',
  },
  behavioral_anomaly: {
    title: 'Order behaviour differs from the usual pattern',
    short: 'Unusual order behaviour',
    badge: 'Unusual order behaviour',
    recommended: 'Manually review the order before taking action',
    explanation: 'The order pattern differs from typical behaviour for this profile.',
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
    explanation: `${fallback} was detected and should be reviewed manually.`,
    badge: fallback,
  };
}
