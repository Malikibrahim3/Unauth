import { connectorActionSchema } from '@/lib/connectors/actions/validate';

describe('controlled connector actions', () => {
  const base = { connectionId: '00000000-0000-0000-0000-000000000001', capabilityId: 'tickets.write_note', externalRecordId: 'ticket-10', payload: { note: 'Case reviewed' }, idempotencyKey: 'action-key-123' };
  it('accepts a low-risk connector request', () => { expect(connectorActionSchema.parse(base).capabilityId).toBe('tickets.write_note'); });
  it.each(['refund.issue', 'request.deny', 'claim.submit'])('rejects forbidden capability %s', (capabilityId) => { expect(connectorActionSchema.safeParse({ ...base, capabilityId }).success).toBe(false); });
  it('requires connection-scoped execution', () => { expect(connectorActionSchema.safeParse({ ...base, connectionId: 'not-a-uuid' }).success).toBe(false); });
});
