import { z } from 'zod';
import { UNRELEASED_ACTION_CAPABILITIES } from '@/lib/connectors/capabilities';

export const connectorActionSchema = z.object({ connectionId: z.string().uuid(), capabilityId: z.string().regex(/^[a-z0-9_.-]+$/).max(100), externalRecordId: z.string().trim().min(1).max(300), caseId: z.string().uuid().nullable().optional(), payload: z.record(z.unknown()).default({}), idempotencyKey: z.string().trim().min(8).max(200) }).superRefine((value, ctx) => { if (UNRELEASED_ACTION_CAPABILITIES.has(value.capabilityId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'This action has not passed its release contract.', path: ['capabilityId'] }); });
