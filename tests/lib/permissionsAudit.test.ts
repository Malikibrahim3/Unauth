import { createServiceClient } from '@/lib/supabase/server';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { logAction } from '@/lib/permissions/audit';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/events/domainEventStore', () => ({
  recordDomainEvent: jest.fn(),
}));

const context = {
  merchantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'owner',
} as const;

describe('logAction durable outbox writer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue({ rpc: jest.fn() });
    (recordDomainEvent as jest.Mock).mockResolvedValue('event-1');
  });

  it('records actor, merchant, object, correlation, effective time, and readable meaning', async () => {
    await logAction({
      ctx: context as never,
      action: 'view_customer',
      resourceType: 'customer',
      resourceId: 'customer-1',
      metadata: { source: 'lookup' },
      correlationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      idempotencyReference: 'audit-view-customer-request-1',
      effectiveAt: '2026-07-21T09:00:00.000Z',
    });

    expect(recordDomainEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      merchantId: context.merchantId,
      eventType: 'audit.action_recorded',
      aggregateType: 'customer',
      aggregateId: null,
      actorType: 'user',
      actorId: context.userId,
      correlationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      idempotencyKey: 'audit-view-customer-request-1',
      handlers: ['auditTimelineProjection'],
      payload: {
        audit: expect.objectContaining({
          action: 'view_customer',
          resource_id: 'customer-1',
          actor_role: 'owner',
          meaning: 'Customer profile viewed',
          effective_at: '2026-07-21T09:00:00.000Z',
          idempotency_reference: 'audit-view-customer-request-1',
          metadata: { source: 'lookup' },
        }),
      },
    }));
  });

  it('does not swallow an audit-store failure', async () => {
    (recordDomainEvent as jest.Mock).mockRejectedValueOnce(new Error('audit store unavailable'));
    await expect(logAction({
      ctx: context as never,
      action: 'export_audit',
      resourceType: 'audit_log',
    })).rejects.toThrow('audit store unavailable');
  });

  it('uses an empty metadata object and a system resource by default', async () => {
    await logAction({ ctx: context as never, action: 'view_audit_trail' });
    expect(recordDomainEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      aggregateType: 'system',
      payload: { audit: expect.objectContaining({ metadata: {} }) },
    }));
  });
});
