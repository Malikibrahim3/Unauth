'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const data = [
  { week: 'W01', clusters: 612,  abusers: 92  },
  { week: 'W02', clusters: 894,  abusers: 154 },
  { week: 'W03', clusters: 1180, abusers: 233 },
  { week: 'W04', clusters: 1672, abusers: 361 },
  { week: 'W05', clusters: 2244, abusers: 502 },
  { week: 'W06', clusters: 3018, abusers: 689 },
  { week: 'W07', clusters: 3994, abusers: 921 },
  { week: 'W08', clusters: 5210, abusers: 1188 },
  { week: 'W09', clusters: 6612, abusers: 1502 },
  { week: 'W10', clusters: 8344, abusers: 1879 },
  { week: 'W11', clusters: 10298, abusers: 2398 },
  { week: 'W12', clusters: 12484, abusers: 3107 },
];

const axisStyle = {
  fontFamily: 'var(--font-dm-mono, monospace)',
  fontSize: 11,
  fill: '#8A8472',
};

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function NetworkChart() {
  return (
    <div
      style={{
        border: '1px solid #2B2922',
        background: '#0F0E0B',
        padding: '20px 16px 8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#8A8472',
            margin: 0,
          }}
        >
          CLUSTERS RESOLVED · 12-WEEK WINDOW
        </p>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            color: '#B8B2A0',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 1, background: '#E8E4D8', display: 'inline-block' }} />
            identity clusters
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 1, background: '#B6512A', display: 'inline-block' }} />
            network-known abusers
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2B2922" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="week"
            tick={axisStyle}
            tickLine={false}
            axisLine={{ stroke: '#2B2922' }}
            interval={1}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={fmt}
          />
          <Tooltip
            cursor={{ stroke: '#3A372E', strokeDasharray: '2 2' }}
            contentStyle={{
              background: '#15140F',
              border: '1px solid #3A372E',
              borderRadius: 0,
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '12px',
              color: '#E8E4D8',
              padding: '8px 10px',
            }}
            labelStyle={{ color: '#8A8472', marginBottom: 4 }}
            itemStyle={{ color: '#E8E4D8' }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'clusters' ? 'identity clusters' : 'network-known abusers',
            ]}
          />
          <Line
            type="monotone"
            dataKey="clusters"
            stroke="#E8E4D8"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: '#E8E4D8', stroke: 'none' }}
          />
          <Line
            type="monotone"
            dataKey="abusers"
            stroke="#B6512A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: '#B6512A', stroke: 'none' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
