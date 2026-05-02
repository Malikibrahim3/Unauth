export interface SignalCopy {
  title: string;
  short: string;
  recommended: string;
}

const SIGNAL_MAP: Record<string, SignalCopy> = {
  inrSpeed: {
    title: "Claimed 'not received' too fast to be real",
    short: "Suspiciously fast 'not received' claim",
    recommended: 'Review this refund manually before approving',
  },
  inrAbuse: {
    title: "Repeat 'item not received' claims",
    short: "Repeat 'not received' claims",
    recommended: 'Hold any pending refund and contact the customer',
  },
  refundRate: {
    title: 'Refunds far more than typical customers',
    short: 'Unusually high refund rate',
    recommended: 'Add to watchlist and review next order manually',
  },
  velocity: {
    title: 'Unusual burst of orders in a short window',
    short: 'Burst of orders in one day',
    recommended: 'Manually review the most recent orders',
  },
  addressClustering: {
    title: 'Same address used by many separate accounts',
    short: 'Delivery address shared with other accounts',
    recommended: 'Treat as a possible organised refund ring',
  },
  emailPattern: {
    title: 'Email address looks disposable or aliased',
    short: 'Disposable or aliased email',
    recommended: 'Require a second confirmation before future refunds',
  },
  paymentChurn: {
    title: 'Many different cards in a short window',
    short: 'Switched payment methods often',
    recommended: 'Review for possible stolen card testing',
  },
  valueAnomaly: {
    title: "Order far larger than this customer's usual",
    short: 'Order value far above normal',
    recommended: 'Manually verify before fulfilling',
  },
  refundPattern: {
    title: 'Refund pattern matches known abuse profiles',
    short: 'Refund behaviour matches known abusers',
    recommended: 'Add to watchlist and require manual approval',
  },
};

export function signalLabel(name: string): SignalCopy {
  return SIGNAL_MAP[name] ?? { title: name, short: name, recommended: 'Review this order manually' };
}
