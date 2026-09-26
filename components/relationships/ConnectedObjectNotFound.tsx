'use client';

import ExactNotFound from '@/components/system/ExactNotFound';

export function ConnectedObjectNotFound({
  returnHref = '/customers',
}: {
  kind: 'order' | 'refund' | 'return' | 'shipment' | 'dispute' | 'support ticket';
  returnHref?: string;
}) {
  return <ExactNotFound data-route-presentation="not-found" stateId="connected-record-not-found" returnHref={returnHref} />;
}
