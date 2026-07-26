export const INVESTIGATION_EVENT_TYPES = [
  'investigation.created',
  'investigation.updated',
  'investigation.sent',
  'investigation.chased',
  'investigation.response_recorded',
  'investigation.closed',
  'investigation.cancelled',
] as const;

export type InvestigationEventType = (typeof INVESTIGATION_EVENT_TYPES)[number];

export const INVESTIGATION_EVENT_HANDLERS = [
  'caseProjection',
  'notificationProjection',
  'workflowHandler',
  'auditTimelineProjection',
] as const;

