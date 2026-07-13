'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { IntelligenceReport } from '@/lib/reporting/intelligence';
import { formatMoney } from '@/lib/utils/format';

export function DashboardCharts({ report }: { report: IntelligenceReport }) {
  const bridge = report.bridges[0];
  const currency = bridge?.currency ?? report.trend[0]?.currency ?? 'GBP';
  const trend = report.trend.filter((point) => point.currency === currency).map((point) => ({ date: point.date.slice(5), exposure: point.exposureMinor / 100, recovered: point.recoveredMinor / 100 }));
  const causes = report.causes.filter((row) => row.currency === currency).slice(0, 5).map((row) => ({ name: row.label, value: row.amountMinor / 100 }));
  const funnel = bridge ? [
    { name: 'Detected', value: bridge.requestedMinor / 100 },
    { name: 'Pursued', value: bridge.recoverableMinor / 100 },
    { name: 'Recovered', value: bridge.recoveredMinor / 100 },
  ] : [];
  const valueLabel = (value: ValueType | undefined) => {
    const scalar = Array.isArray(value) ? value[0] : value;
    return formatMoney(Math.round(Number(scalar ?? 0) * 100), currency);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-3" aria-label="Payout performance charts">
      <ChartCard title={`Exposure and recovered · ${currency}`} empty={trend.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border-muted)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip formatter={valueLabel} />
            <Area type="monotone" dataKey="exposure" stroke="var(--warning)" fill="var(--warning-bg)" strokeWidth={2} />
            <Area type="monotone" dataKey="recovered" stroke="var(--success)" fill="var(--success-bg)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title={`Loss causes · ${currency}`} empty={causes.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={causes} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--border-muted)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={valueLabel} />
            <Bar dataKey="value" fill="var(--accent)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title={`Recovery funnel · ${currency}`} empty={funnel.length === 0}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnel} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={valueLabel} />
            <Bar dataKey="value" fill="var(--info)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="text-sm font-semibold">{title}</h2>{empty ? <p className="mt-8 text-sm text-[var(--text-secondary)]">No data in this period.</p> : <div className="mt-3">{children}</div>}</div>;
}
