import { mapShipBobOrder, mapShipBobReturn } from '@/lib/connectors/providers/shipbob/mappings';
import {
  resolveParentByExternalId,
  requireParentOrDefer,
  DeferredReconciliation,
} from '@/lib/connectors/reconciliation';

describe('ShipBob mapping', () => {
  it('maps order shipments to fulfilments + shipments', () => {
    const { fulfilments, shipments } = mapShipBobOrder({
      reference_id: 'ORDER-1001',
      status: 'Processing',
      shipments: [{ id: 'sb-1', status: 'Delivered', tracking_number: 'TN1', carrier: 'ups', ship_date: '2026-07-11T00:00:00Z' }],
    });
    expect(fulfilments[0]).toMatchObject({ externalId: 'sb-1', orderExternalId: 'ORDER-1001', trackingNumber: 'TN1' });
    expect(shipments[0].status).toBe('delivered');
  });

  it('keeps nested tracking, service, and delivery timestamps from the current API shape', () => {
    const { fulfilments, shipments } = mapShipBobOrder({
      reference_id: 'ORDER-1002',
      shipments: [{
        id: 'sb-2',
        status: 'Delivered',
        actual_fulfillment_date: '2026-07-11T10:00:00-04:00',
        delivery_date: '2026-07-12T15:00:00-04:00',
        tracking: { tracking_number: 'TN2', carrier: 'UPS', carrier_service: 'Ground' },
      }],
    });
    expect(fulfilments[0]).toMatchObject({ trackingNumber: 'TN2', carrier: 'UPS' });
    expect(shipments[0]).toMatchObject({
      trackingNumber: 'TN2', carrier: 'UPS', service: 'Ground',
      shippedAt: '2026-07-11T14:00:00.000Z', deliveredAt: '2026-07-12T19:00:00.000Z',
    });
  });

  it('maps a return', () => {
    const { canonicalReturn } = mapShipBobReturn({ id: 'r-1', status: 'received', disposition: 'restock' }, 'ORDER-1001');
    expect(canonicalReturn).toMatchObject({ externalId: 'r-1', orderExternalId: 'ORDER-1001', status: 'received' });
  });
});

describe('child-before-parent reconciliation', () => {
  function client(parentRow: unknown) {
    const builder: any = {
      select: () => builder, eq: () => builder, not: () => builder, limit: () => builder,
      maybeSingle: async () => ({ data: parentRow, error: null }),
    };
    return { from: () => builder } as any;
  }

  it('resolves a parent that has been ingested', async () => {
    const res = await resolveParentByExternalId(client({ canonical_entity_id: 'o-1', canonical_entity_type: 'order' }), 'm', 'order', 'ORDER-1');
    expect(res).toEqual({ found: true, canonicalEntityId: 'o-1', canonicalEntityType: 'order' });
  });

  it('reports not-found when the parent is absent', async () => {
    const res = await resolveParentByExternalId(client(null), 'm', 'order', 'ORDER-1');
    expect(res).toEqual({ found: false });
  });

  it('requireParentOrDefer throws DeferredReconciliation for a missing parent (never discards)', async () => {
    await expect(requireParentOrDefer(client(null), 'm', 'order', 'ORDER-1')).rejects.toBeInstanceOf(DeferredReconciliation);
  });

  it('requireParentOrDefer returns null when the child has no parent reference', async () => {
    expect(await requireParentOrDefer(client(null), 'm', 'order', null)).toBeNull();
  });
});
