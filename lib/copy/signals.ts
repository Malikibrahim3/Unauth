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
  recommended: 'This order has evidence that merits manual review.',
  explanation: 'This order shares characteristics that merit manual review.',
};

export const SIGNAL_COPY: Record<string, SignalCopy> = {
  inrSpeed: {
    title: "'Not received' claim filed unusually quickly after delivery",
    short: "Fast 'not received' claim",
    recommended: "The claim timing is unusually fast and should be read alongside fulfilment evidence.",
    explanation: "The customer filed a 'not received' claim sooner than expected after delivery.",
  },
  inrAbuse: {
    title: "Repeated 'item not received' claims across orders",
    short: "Repeated 'not received' claims",
    recommended: "The repeat claim pattern is strong enough to inspect prior claim history before deciding.",
    explanation: "The account shows a repeat pattern of 'item not received' claims.",
  },
  refundRate: {
    title: 'Refund rate significantly above typical customer baseline',
    short: 'High refund claim rate',
    recommended: 'The refund rate is materially above baseline and should be monitored in the review queue.',
    explanation: 'This customer claims refunds more often than their typical order history suggests.',
  },
  velocity: {
    title: 'Unusual concentration of orders within a short window',
    short: 'Concentrated order burst',
    recommended: 'The recent order burst is unusual enough to inspect the latest orders together.',
    explanation: 'Several orders were placed in a short period, which can indicate unusual activity.',
  },
  addressClustering: {
    title: 'Delivery address shared across multiple separate accounts',
    short: 'Shared delivery address signal',
    recommended: 'Shared delivery evidence can help explain whether the linked accounts are related.',
    explanation: 'The same delivery address appears across multiple account identities.',
  },
  emailPattern: {
    title: 'Email address pattern suggests disposable or aliased account',
    short: 'Disposable or aliased email pattern',
    recommended: 'The email pattern is weak alone, but useful as context beside stronger identifiers.',
    explanation: 'The email pattern looks temporary or intentionally varied.',
  },
  paymentChurn: {
    title: 'Multiple different payment methods used in a short window',
    short: 'Multiple payment methods',
    recommended: 'Payment changes should be interpreted with the linked-account timeline.',
    explanation: 'The customer switched payment methods repeatedly in a short time.',
  },
  valueAnomaly: {
    title: "Order value significantly above this customer's historical baseline",
    short: 'Unusually high order value',
    recommended: 'The order value is unusually high relative to the customer baseline.',
    explanation: "This order is much higher in value than the customer's usual pattern.",
  },
  refundPattern: {
    title: 'Refund claim pattern matches previously seen repeated claim profiles',
    short: 'Repeated claim pattern match',
    recommended: 'The repeated-claim profile is strong enough to keep visible in the review queue.',
    explanation: 'The claim pattern resembles prior repeated-claim behaviour.',
  },
  crossMerchantSignal: {
    title: 'Privacy-safe cross-merchant identity link',
    short: 'Cross-merchant identity link',
    badge: 'Network identity link',
    recommended: 'The profile is seen across multiple merchants through privacy-safe aggregate evidence.',
    explanation: 'The profile has identity signals that appear in the wider merchant network without exposing other merchants or orders.',
  },
  networkDeviceLink: {
    title: 'Device pattern linked in the merchant network',
    short: 'Network device link',
    badge: 'Network device link',
    recommended: 'The device pattern supports the cross-merchant identity context.',
    explanation: 'A device-level signal contributes to the network identity link.',
  },
  ipCluster: {
    title: 'IP pattern shared across linked activity',
    short: 'IP cluster',
    badge: 'IP cluster',
    recommended: 'The IP pattern is contextual evidence beside stronger identity signals.',
    explanation: 'The IP pattern appears across linked order activity.',
  },

  shared_email: {
    title: 'Shared email address across linked activity',
    short: 'Shared email address',
    badge: 'Shared email address',
    recommended: 'The shared email is a direct identity link across the displayed order activity.',
    explanation: 'The same email address appears across linked order activity.',
  },
  shared_phone: {
    title: 'Shared phone number across linked activity',
    short: 'Shared phone number',
    badge: 'Shared phone number',
    recommended: 'The shared phone number connects the displayed order activity.',
    explanation: 'The same phone number appears across linked order activity.',
  },
  shared_address: {
    title: 'Shared delivery address across linked activity',
    short: 'Shared delivery address',
    badge: 'Shared delivery address',
    recommended: 'The shared delivery address connects the displayed order activity.',
    explanation: 'The same delivery address appears across linked order activity.',
  },
  shared_card: {
    title: 'Shared payment card across linked activity',
    short: 'Shared payment card',
    badge: 'Shared payment card',
    recommended: 'The shared payment card is strong identity evidence across linked orders.',
    explanation: 'The same payment card appears across linked order activity.',
  },
  shared_account_id: {
    title: 'Shared account identifier across linked activity',
    short: 'Shared account',
    badge: 'Shared account',
    recommended: 'The shared account identifier is strong identity evidence across linked activity.',
    explanation: 'The same underlying account identifier appears across linked activity.',
  },
  shared_ip: {
    title: 'Shared IP address across linked activity',
    short: 'Shared IP address',
    badge: 'Shared IP address',
    recommended: 'The shared IP is contextual evidence and should be read with stronger identifiers.',
    explanation: 'The same IP address appears across linked order activity.',
  },
  shared_device: {
    title: 'Shared device across linked activity',
    short: 'Shared device',
    badge: 'Shared device',
    recommended: 'The shared device is strong identity evidence across linked orders.',
    explanation: 'The same device appears across linked order activity.',
  },
  refund_velocity: {
    title: 'Refund claims are arriving unusually quickly',
    short: 'Fast repeat claims',
    badge: 'Fast repeat claims',
    recommended: 'The recent claim timeline is faster than expected.',
    explanation: 'Claims are being filed faster than expected after ordering or delivery.',
  },
  chargeback_after_delivery: {
    title: 'Chargeback was filed after delivery evidence was recorded',
    short: 'Chargeback after delivery',
    badge: 'Chargeback after delivery',
    recommended: 'Delivery evidence is present and relevant to the chargeback timeline.',
    explanation: 'A chargeback was filed even though delivery evidence exists.',
  },
  item_not_received_repeat: {
    title: "Repeated 'item not received' claims were detected",
    short: "Repeated 'item not received' claims",
    badge: "Repeated 'item not received' claims",
    recommended: "Prior 'item not received' claims are relevant to this profile.",
    explanation: "The account has repeated 'item not received' claims across orders.",
  },
  address_mismatch: {
    title: 'Address details vary across linked order activity',
    short: 'Address mismatch',
    badge: 'Address mismatch',
    recommended: 'Address changes are visible across linked orders and may need context.',
    explanation: 'The address details differ across linked orders.',
  },
  name_variant: {
    title: 'Name details vary across linked order activity',
    short: 'Name variation',
    badge: 'Name variation',
    recommended: 'Name variation is visible across linked orders.',
    explanation: 'Different name variants appear across linked orders.',
  },
  behavioral_anomaly: {
    title: 'Order behaviour differs from the usual pattern',
    short: 'Unusual order behaviour',
    badge: 'Unusual order behaviour',
    recommended: 'The order pattern differs from this profile baseline.',
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
    explanation: `${fallback} was detected and is visible as supporting context.`,
    badge: fallback,
  };
}
