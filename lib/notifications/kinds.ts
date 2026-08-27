export const NOTIFICATION_KINDS = [
  'assignment',
  'mention',
  'approaching_deadline',
  'evidence_update',
  'decision_request',
  'recovery_outcome',
  'sync_failure',
  'high_value_case_alert',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NEEDS_NOTIFICATION_KINDS = [
  'assignment',
  'mention',
  'approaching_deadline',
  'evidence_update',
  'decision_request',
  'sync_failure',
  'high_value_case_alert',
] as const satisfies readonly NotificationKind[];
