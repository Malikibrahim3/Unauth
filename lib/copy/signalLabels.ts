export interface SignalCopy {
  title: string;
  short: string;
  recommended: string;
}

const SIGNAL_MAP: Record<string, SignalCopy> = {
  inrSpeed: {
    title: "'Not received' claim filed unusually quickly after delivery",
    short: "Fast 'not received' claim",
    recommended: 'Review this refund manually before approving',
  },
  inrAbuse: {
    title: "Repeated 'item not received' claims across orders",
    short: "Repeated 'not received' claims",
    recommended: 'Hold any pending refund and request additional verification',
  },
  refundRate: {
    title: 'Refund rate significantly above typical customer baseline',
    short: 'Elevated refund rate',
    recommended: 'Add to review list and review next order manually',
  },
  velocity: {
    title: 'Unusual concentration of orders within a short window',
    short: 'Concentrated order burst',
    recommended: 'Manually review the most recent orders',
  },
  addressClustering: {
    title: 'Delivery address shared across multiple separate accounts',
    short: 'Shared delivery address signal',
    recommended: 'Compare delivery evidence across linked orders',
  },
  emailPattern: {
    title: 'Email address pattern suggests disposable or aliased account',
    short: 'Disposable or aliased email pattern',
    recommended: 'Request additional verification before future refunds',
  },
  paymentChurn: {
    title: 'Multiple different payment methods used in a short window',
    short: 'Multiple payment methods',
    recommended: 'Review payment history across linked accounts',
  },
  valueAnomaly: {
    title: "Order value significantly above this customer's historical baseline",
    short: 'Above-baseline order value',
    recommended: 'Manually verify before fulfilling',
  },
  refundPattern: {
    title: 'Refund claim pattern matches previously seen repeated claim profiles',
    short: 'Repeated claim pattern match',
    recommended: 'Add to review list and require manual approval',
  },
};

export function signalLabel(name: string): SignalCopy {
  return SIGNAL_MAP[name] ?? { title: name, short: name, recommended: 'Review this order manually' };
}
