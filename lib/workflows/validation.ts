import { z } from 'zod';

export const conditionSchema = z.object({ field: z.string().regex(/^[a-zA-Z0-9_.]+$/).max(100), operator: z.enum(['eq','neq','in','exists']), value: z.unknown().optional() });
export const outputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_task'), title: z.string().min(1).max(200), ownerRole: z.string().max(100).optional(), priority: z.enum(['low','medium','high','urgent']).optional(), dueInHours: z.number().int().min(1).max(8760).optional() }),
  z.object({ type: z.literal('request_notification'), recipientUserId: z.string().uuid(), kind: z.enum(['assignment','mention','approaching_deadline','evidence_update','decision_request','recovery_outcome','sync_failure','daily_work_summary','high_value_case_alert','scheduled_report']), title: z.string().min(1).max(200), body: z.string().max(2000).optional() }),
  z.object({ type: z.literal('request_evidence'), evidenceType: z.string().min(1).max(100), title: z.string().max(200).optional() }),
  z.object({ type: z.literal('set_deadline'), dueInHours: z.number().int().min(1).max(8760) }),
]);
export const workflowDefinitionSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).optional(), triggerEventType: z.string().trim().min(1).max(120), conditions: z.array(conditionSchema).max(20).default([]), outputs: z.array(outputSchema).min(1).max(20), active: z.boolean().default(true) });
