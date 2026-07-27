import type { ChartTheme } from '@/components/charts/authenticated/core/useChartTheme';
import { ChartState } from '@/components/charts/authenticated/ChartPanel';

export function resolveChartColour(colour: string, theme: ChartTheme): string {
  const token = /^var\((--[^,)]+)\)$/.exec(colour)?.[1];
  if (!token) return colour;
  return (theme as Record<string, string>)[token] || colour;
}

export function AnalyticsChartEmpty({ height, label }: { height: number; label: string }) {
  return (
    <div style={{ height, display: 'grid', placeItems: 'center' }} role="status">
      <ChartState title={label} description="No reconciled data is available for this view." />
    </div>
  );
}

export const analyticsAxisStyle = {
  fontSize: 12,
  fontFamily: 'var(--ua-font-sans)',
} as const;
