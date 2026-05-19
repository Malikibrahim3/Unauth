import { SIGNAL_WEIGHTS } from './weights';

type SignalName = keyof typeof SIGNAL_WEIGHTS;

export const SIGNAL_DESCRIPTIONS: Record<SignalName, string> = {
  refundRate: "Customer refund rate vs population baseline",
  inrAbuse: "Repeated INR claims",
  velocity: "Burst ordering across 1h / 24h / 7d windows",
  inrSpeed: "INR claim within 48h of order",
  emailPattern: "Disposable or aliased email patterns",
  addressClustering: "Multiple emails shipping to the same address",
  billingAddressClustering: "Multiple emails linked through billing-address dispute history",
  valueAnomaly: "Order value far outside the customer's norm",
  paymentChurn: "Tight-window payment-method churn",
  refundPattern: "Historical refund-pattern intelligence",
  crossMerchant: "Cross-network refund or INR history (k-anon >=3)",
  disputeHistory: "Prior disputes, refund requests, or return requests",
  addressMismatch: "Billing and shipping address mismatch",
  networkDeviceLink: "Shared device or network identifier linked to a known fraud cluster",
  networkDeviceLinkActive: "Shared device or network identifier plus active current-order dispute evidence",
};
