'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  type TooltipProps,
} from 'recharts';

export type TrendDataPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

interface WeeklyTrendChartProps {
  data: TrendDataPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  valueFormatter?: (n: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

type CustomTooltipPayload = {
  name: string;
  value: number;
  color: string;
};

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: TooltipProps<number, string> & { valueFormatter?: (n: number) => string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        color: 'var(--ink-primary)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--ink-tertiary)' }}>{label}</p>
      {(payload as CustomTooltipPayload[]).map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

const gradientId = 'trend-primary';
const gradientIdSecondary = 'trend-secondary';

export default function WeeklyTrendChart({
  data,
  color = 'var(--accent)',
  secondaryColor = 'var(--sev-probable)',
  height = 140,
  valueFormatter,
  primaryLabel = 'Value',
  secondaryLabel,
}: WeeklyTrendChartProps) {
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          {hasSecondary && (
            <linearGradient id={gradientIdSecondary} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.18} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.02} />
            </linearGradient>
          )}
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--ink-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          axisLine={false}
          tickLine={false}
          dy={4}
        />
        <Tooltip
          content={
            <CustomTooltip valueFormatter={valueFormatter} />
          }
          cursor={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={primaryLabel}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: color }}
        />
        {hasSecondary && secondaryLabel && (
          <Area
            type="monotone"
            dataKey="secondaryValue"
            name={secondaryLabel}
            stroke={secondaryColor}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill={`url(#${gradientIdSecondary})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: secondaryColor }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
