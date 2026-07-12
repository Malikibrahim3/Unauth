import { evaluateConditions } from '@/lib/workflows/evaluate';
import { workflowDefinitionSchema } from '@/lib/workflows/validation';

describe('workflow engine', () => {
  it('evaluates nested facts with limited deterministic operators', () => {
    const payload = { case: { status: 'evidence_needed', exposure_minor: 5000 }, source: 'support' };
    expect(evaluateConditions([
      { field: 'case.status', operator: 'eq', value: 'evidence_needed' },
      { field: 'source', operator: 'in', value: ['support', 'manual'] },
      { field: 'case.exposure_minor', operator: 'exists' },
    ], payload)).toBe(true);
    expect(evaluateConditions([{ field: 'case.status', operator: 'neq', value: 'evidence_needed' }], payload)).toBe(false);
  });

  it('accepts bounded task and notification outputs', () => {
    expect(workflowDefinitionSchema.parse({
      name: 'Request missing evidence', triggerEventType: 'case.updated',
      conditions: [{ field: 'status', operator: 'eq', value: 'evidence_needed' }],
      outputs: [{ type: 'request_evidence', evidenceType: 'tracking' }, { type: 'create_task', title: 'Review evidence', priority: 'high' }],
    }).outputs).toHaveLength(2);
  });

  it('rejects arbitrary HTTP and unrestricted action outputs', () => {
    expect(workflowDefinitionSchema.safeParse({ name: 'Unsafe', triggerEventType: 'case.updated', outputs: [{ type: 'http_request', url: 'https://example.com' }] }).success).toBe(false);
  });
});
