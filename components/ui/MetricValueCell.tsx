'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useChangedValueHighlight } from '@/lib/design/useChangedValueHighlight';

/**
 * §7.2 LP-MOT-10 changed-value wash for a single metric value.
 *
 * The wash needs browser state (`useChangedValueHighlight`), so it lives in its
 * own `'use client'` leaf. This keeps the surrounding `MetricGroup` a shared
 * component that still renders correctly inside a Server Component (e.g. the
 * server-rendered KPI routes reached through `WorkbenchKpiStrip`) instead of
 * throwing "called a client hook from the server".
 *
 * Only a primitive `value` (string/number) is safe to diff — an arbitrary
 * `ReactNode` (e.g. a caller-supplied sparkline) is a new object every render
 * regardless of whether it visually changed, which would misfire the wash.
 */
export function MetricValueCell({ value }: { value: ReactNode }) {
  const isPrimitive = typeof value === 'string' || typeof value === 'number';
  const highlighting = useChangedValueHighlight(isPrimitive ? value : null);
  return (
    <dd className={cn('ua-metric-group__value', isPrimitive && highlighting && 'ua-value-wash')}>{value}</dd>
  );
}
