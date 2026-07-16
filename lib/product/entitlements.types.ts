export type Entitlement =
  | 'EVIDENCE_PACKS'
  | 'STORE_SYNC'
  | 'CE3_READINESS_CHECK'
  | 'CUSTOMER_SEARCH'
  | 'CUSTOMER_DOSSIER'
  | 'CLAIM_REVIEW_QUEUE'
  | 'HELPDESK_WIDGET'
  | 'REPORTS_ADVANCED'
  | 'LIVE_LOOKUP_API'
  | 'QUICK_SCORE';

export interface EntitlementMeta {
  label: string;
  availability: 'live' | 'future';
}
