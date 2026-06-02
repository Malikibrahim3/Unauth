'use client';

import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import { Section } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import type { CustomerEventStreamItem } from '@/lib/analysis/customerIntelligence';

export function CustomerIntelligenceDrawerHistorySection({
  orderHistory,
  ordersExpanded,
  onToggleOrders,
  roadmapEvents,
}: {
  orderHistory: CustomerIntelligencePanel['orderHistory'];
  ordersExpanded: boolean;
  onToggleOrders: () => void;
  roadmapEvents: CustomerEventStreamItem[];
}) {
  if (orderHistory.length === 0) {
    return (
      <Section title="Order & claim history" count={0}>
        <p className="cid-detail-label" style={{ fontStyle: 'italic' }}>
          No orders in current dataset.
        </p>
      </Section>
    );
  }

  const visibleEvents = ordersExpanded ? roadmapEvents : roadmapEvents.slice(0, 6);

  return (
    <Section title="Order & claim history" count={orderHistory.length}>
      <BehaviorRoadmap events={visibleEvents} />
      {orderHistory.length > 6 ? (
        <button type="button" onClick={onToggleOrders} className="cid-expand-btn">
          {ordersExpanded ? 'Show fewer' : `Show all ${orderHistory.length} events`}
        </button>
      ) : null}
    </Section>
  );
}
