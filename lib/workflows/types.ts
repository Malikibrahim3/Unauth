export type WorkflowCondition = { field: string; operator: 'eq' | 'neq' | 'in' | 'exists'; value?: unknown };
export type WorkflowOutput =
  | { type: 'create_task'; title: string; ownerRole?: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; dueInHours?: number }
  | { type: 'request_notification'; recipientUserId: string; kind: string; title: string; body?: string }
  | { type: 'request_evidence'; evidenceType: string; title?: string }
  | { type: 'set_deadline'; dueInHours: number };
export type WorkflowDefinition = { id: string; merchant_id: string; name: string; trigger_event_type: string; conditions: WorkflowCondition[]; outputs: WorkflowOutput[]; active: boolean; version: number };
