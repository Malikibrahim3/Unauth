import { z } from 'zod';
import {
  INVESTIGATION_CHANNELS,
  INVESTIGATION_RESPONSE_OUTCOMES,
  INVESTIGATION_TARGETS,
} from '@/lib/investigations/types';
import {
  ATTRIBUTION_CONFIDENCES,
  LIKELY_OWNERS,
  LOSS_ATTRIBUTION_LABELS,
  RECOVERABILITIES,
} from '@/lib/payouts/types';

const optionalUuid = z.string().uuid().nullable().optional();
const optionalUrl = z.string().trim().url().max(2000).nullable().optional().or(z.literal(''));
const optionalDate = z.string().datetime({ offset: true }).nullable().optional().or(z.literal(''));

export const createInvestigationSchema = z.object({
  target_type: z.enum(INVESTIGATION_TARGETS),
  target_name: z.string().trim().max(240).nullable().optional(),
  partner_id: optionalUuid,
  is_primary: z.boolean().default(false),
  evidence_gap: z.string().trim().min(3).max(2000),
  recommended_reason: z.string().trim().max(2000).nullable().optional(),
  override_rationale: z.string().trim().min(5).max(2000).nullable().optional(),
  requested_evidence: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  request_summary: z.string().trim().min(1).max(2000),
  subject: z.string().trim().min(1).max(500),
  request_body: z.string().trim().min(1).max(20000),
  recipient: z.string().trim().max(500).nullable().optional(),
  source_channel: z.enum(INVESTIGATION_CHANNELS).nullable().optional(),
  due_at: optionalDate,
});

export const updateInvestigationSchema = createInvestigationSchema
  .omit({ is_primary: true })
  .partial()
  .extend({
    expected_version: z.number().int().min(1),
  });

export const markInvestigationSentSchema = z.object({
  expected_version: z.number().int().min(1),
  case_version: z.number().int().min(1).optional(),
  source_channel: z.enum(['manual', 'portal', 'api']),
  due_at: z.string().datetime({ offset: true }),
  external_reference: z.string().trim().min(1).max(500).optional(),
  external_url: optionalUrl,
  note: z.string().trim().max(2000).optional(),
}).superRefine((value, ctx) => {
  if (value.source_channel === 'portal' && !value.external_reference && !value.external_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['external_reference'],
      message: 'Portal sends require a reference or portal URL.',
    });
  }
});

export const sendInvestigationEmailSchema = z.object({
  expected_version: z.number().int().min(1),
  due_at: z.string().datetime({ offset: true }),
});

export const chaseInvestigationSchema = z.object({
  expected_version: z.number().int().min(1),
  note: z.string().trim().min(3).max(2000),
  due_at: optionalDate,
});

export const recordInvestigationResponseSchema = z.object({
  expected_version: z.number().int().min(1),
  case_version: z.number().int().min(1).optional(),
  response_outcome: z.enum(INVESTIGATION_RESPONSE_OUTCOMES).refine(
    (value) => value !== 'no_response',
    'Use close with no response for provider silence.',
  ),
  response_summary: z.string().trim().min(3).max(10000),
  response_body: z.string().max(50000).nullable().optional(),
  responder_name: z.string().trim().max(240).nullable().optional(),
  response_received_at: optionalDate,
  external_reference: z.string().trim().max(500).nullable().optional(),
  external_url: optionalUrl,
});

export const closeInvestigationSchema = z.object({
  expected_version: z.number().int().min(1),
  case_version: z.number().int().min(1).optional(),
  no_response: z.boolean().default(false),
  closure_reason: z.string().trim().max(2000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.no_response && (!value.closure_reason || value.closure_reason.length < 5)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['closure_reason'],
      message: 'Explain the explicit no-response closure.',
    });
  }
});

export const cancelInvestigationSchema = z.object({
  expected_version: z.number().int().min(1),
  case_version: z.number().int().min(1).optional(),
  closure_reason: z.string().trim().min(5).max(2000),
});

export const recordCaseResponsibilitySchema = z.object({
  expected_version: z.number().int().min(1),
  loss_attribution: z.enum(LOSS_ATTRIBUTION_LABELS),
  attribution_confidence: z.enum(ATTRIBUTION_CONFIDENCES),
  recovery_owner: z.enum(LIKELY_OWNERS),
  recoverability: z.enum(RECOVERABILITIES),
  supporting_evidence_ids: z.array(z.string().uuid()).max(50).default([]),
  conflicting_evidence_ids: z.array(z.string().uuid()).max(50).default([]),
  rationale: z.string().trim().max(4000).nullable().optional(),
}).superRefine((value, ctx) => {
  const supporting = new Set(value.supporting_evidence_ids);
  if (value.conflicting_evidence_ids.some((id) => supporting.has(id))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['conflicting_evidence_ids'],
      message: 'The same evidence cannot both support and conflict.',
    });
  }
});

export function idempotencyKeyFrom(request: Request): string | null {
  const value = request.headers.get('idempotency-key')?.trim();
  return value && value.length >= 8 && value.length <= 180 ? value : null;
}
