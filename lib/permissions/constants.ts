/**
 * Permission constants shared by server and client-safe route metadata.
 *
 * Keep this module free of Next.js server imports so presentation code can
 * consume route permissions in browsers and jsdom without loading the server
 * request implementation.
 */
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_AUDIT: 'view_audit',
  VIEW_CUSTOMERS: 'view_customers',
  VIEW_LOOKUP: 'view_lookup',
  VIEW_WATCHLIST: 'view_watchlist',
  VIEW_CHARGEBACKS: 'view_chargebacks',
  VIEW_INBOX: 'view_inbox',
  VIEW_SAVED: 'view_saved',
  VIEW_TEAM: 'view_team',
  VIEW_SETTINGS: 'view_settings',
  VIEW_AUDIT_TRAIL: 'view_audit_trail',
  MANAGE_WORK_VIEWS: 'manage_work_views',
  EXPORT_AUDIT: 'export_audit',
  LOOKUP_CUSTOMER: 'lookup_customer',
  UPDATE_CUSTOMER_STATUS: 'update_customer_status',
  ADD_CUSTOMER_NOTE: 'add_customer_note',
  DELETE_CUSTOMER_NOTE: 'delete_customer_note',
  MANAGE_WATCHLIST: 'manage_watchlist',
  GENERATE_EVIDENCE: 'generate_evidence',
  SUBMIT_FRAUD_FEEDBACK: 'submit_fraud_feedback',
  SUBMIT_PAYOUT_DECISIONS: 'submit_payout_decisions',
  MANAGE_WORK: 'manage_work',
  DISMISS_TRANSACTION: 'dismiss_transaction',
  HIDE_JOB: 'hide_job',
  BULK_DELETE: 'bulk_delete',
  MANAGE_TEAM: 'manage_team',
  MANAGE_SETTINGS: 'manage_settings',
  GRANT_PERMISSIONS: 'grant_permissions',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
