'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export interface RunChartData {
  id: string;
  filename: string;
  total_rows: number;
  flagged_count: number;
  created_at: string;
}

interface Props {
  runs: RunChartData[];
}

function flagColor(rate: number): string {
  if (rate >= 0.2) return 'var(--risk-critical)';
  if (rate >= 0.1) return 'var(--risk-high)';
  if (rate >= 0.04) return 'var(--risk-medium)';
  return 'var(--risk-low)';
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <div className="font-medium mb-0.5 truncate max-w-[180px]">{label}</div>
        <div style={{ color: 'var(--text-muted)' }}>Flag rate: <span style={{ color: 'var(--text)' }}>{payload[0].value.toFixed(1)}%</span></div>
      </div>
    );
  }
  return null;
};

const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-md border text-xs shadow-md"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <div className="font-medium mb-0.5">{label}</div>
        <div style={{ color: 'var(--text-muted)' }}>Transactions flagged: <span style={{ color: 'var(--text)' }}>{payload[0].value.toLocaleString()}</span></div>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({ runs }: Props) {
  if (runs.length === 0) return null;

  // Flag rate per run (last 10, oldest first for the bar chart)
  const rateData = [...runs]
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      name: r.filename.replace(/\.[^.]+$/, '').slice(0, 20),
      rate: r.total_rows > 0 ? (r.flagged_count / r.total_rows) * 100 : 0,
      rawRate: r.total_rows > 0 ? r.flagged_count / r.total_rows : 0,
    }));

  // Trend: flagged count over time (all runs, oldest first)
  const trendData = [...runs]
    .reverse()
    .map((r) => ({
      name: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      flagged: r.flagged_count ?? 0,
    }));

  // Totals for the summary bar
  const totalRows = runs.reduce((s, r) => s + r.total_rows, 0);
  const totalFlagged = runs.reduce((s, r) => s + (r.flagged_count ?? 0), 0);
  const flaggedPct = totalRows > 0 ? (totalFlagged / totalRows) * 100 : 0;
  const cleanPct = 100 - flaggedPct;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Flag rate per run */}
      <div
        className="rounded-lg border px-5 pt-4 pb-3"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="text-overline mb-0.5" style={{ color: 'var(--text-muted)' }}>Flag Rate by Run</div>
        <div className="text-caption mb-4" style={{ color: 'var(--text-subtle)' }}>Last {rateData.length} audits</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={rateData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={14}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-subtle)' }} />
            <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
              {rateData.map((entry, i) => (
                <Cell key={i} fill={flagColor(entry.rawRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Flagged count trend */}
      <div
        className="rounded-lg border px-5 pt-4 pb-3"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="text-overline mb-0.5" style={{ color: 'var(--text-muted)' }}>Flagged Transactions Over Time</div>
        <div className="text-caption mb-4" style={{ color: 'var(--text-subtle)' }}>Per audit run</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-subtle)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--border)' }} />
            <Line
              type="monotone"
              dataKey="flagged"
              stroke="var(--risk-high)"
              strokeWidth={2}
              dot={{ fill: 'var(--risk-high)', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Overall summary bar */}
      <div
        className="col-span-2 rounded-lg border px-5 py-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-overline" style={{ color: 'var(--text-muted)' }}>Overall Composition</div>
          <div className="flex items-center gap-4 text-caption" style={{ color: 'var(--text-subtle)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--risk-high)' }} />
              Flagged {flaggedPct.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: 'var(--risk-low)' }} />
              Clean {cleanPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${flaggedPct}%`, background: 'var(--risk-high)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>
            {totalFlagged.toLocaleString()} flagged of {totalRows.toLocaleString()} transactions
          </span>
          <span className="text-caption font-mono" style={{ color: 'var(--text-muted)' }}>
            {(totalRows - totalFlagged).toLocaleString()} clean
          </span>
        </div>
      </div>
    </div>
  );
}
