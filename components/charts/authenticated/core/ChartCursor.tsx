import type { ReactNode } from 'react';
import { CURSOR_DASH, CURSOR_WIDTH } from './geometry';

type RechartsCursorProps = {
  points?: Array<{ x: number; y: number }>;
  height?: number;
  y?: number;
};

/**
 * T10 crosshair — 1px dashed vertical line in --authority-border-strong, snapping to the nearest
 * data position. Pass as the `cursor` prop on Recharts <Tooltip> for line/combo/matrix charts.
 * Bars and cells are their own hit targets and must not use this (they lift on hover instead).
 */
export function ChartCursor({ points, height }: RechartsCursorProps) {
  if (!points?.length) return null;
  const x = points[0].x;
  const top = points[0].y ?? 0;
  const h = height ?? 0;
  return (
    <line
      x1={x}
      x2={x}
      y1={top}
      y2={top + h}
      stroke="#d8d4cf"
      strokeWidth={CURSOR_WIDTH}
      strokeDasharray={CURSOR_DASH.join(' ')}
      pointerEvents="none"
    />
  );
}

/** Inverse axis pill for the active x label, per T10. */
export function ChartAxisPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: '8px',
        background: '#f4f3f1',
        color: '#fff',
        font: '10px/1.3 Inter,ui-sans-serif,system-ui,sans-serif',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </span>
  );
}
