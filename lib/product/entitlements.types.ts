export type Entitlement =
  | 'EVIDENCE_PACKS'
  | 'STORE_SYNC'
  | 'CSV_IMPORT_LIMITED'
  | 'CSV_IMPORT_FULL'
  | 'CE3_READINESS_CHECK'
  | 'CUSTOMER_SEARCH'
  | 'CUSTOMER_DOSSIER'
  | 'CLAIM_REVIEW_QUEUE'
  | 'HELPDESK_WIDGET'
  | 'WATCHLIST'
  | 'REPORTS_ADVANCED'
  | 'LIVE_LOOKUP_API'
  | 'QUICK_SCORE'
  | 'NETWORK_GRAPH'
  | 'CHECKOUT_CONTROLS'
  | 'SIGNAL_API';

export interface EntitlementMeta {
  label: string;
  availability: 'live' | 'future';
}
