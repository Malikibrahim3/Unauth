export type TimelineEventType =
  | 'order'
  | 'refund'
  | 'chargeback'
  | 'return'
  | 'address_change'
  | 'email_change'
  | 'account_change'
  | 'high_risk_event'
  | 'note';

export type TimelineEventSeverity = 'info' | 'warning' | 'danger';

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  meta?: { label: string; value: string }[];
  severity?: TimelineEventSeverity;
}
