'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionCard } from '@/components/ui/SectionCard';
import { cn } from '@/lib/utils';

export interface RunChartData {
  id: string;
  filename: string;
  total_rows: number;
  flagged_count: number;
  created_at: string;
}

export interface TransactionChartData {
  id: string;
  job_id: string;
  processed_at: string;
  order_value: number | string | null;
  refund_claimed: boolean | null;
  chargeback_filed: boolean | null;
  risk_level: string | null;
  identity_confidence_grade: string | null;
  match_status: string | null;
  identity_score: number | string | null;
  match_score: number | string | null;
  signals_matched: string[] | null;
  fraud_flags: string[] | null;
}

interface Props {
  runs: RunChartData[];
  transactions: TransactionChartData[];
}

type RangeDays = 30 | 60 | 90;
type VolumeMode = 'daily' | 'weekly';

const GRADE_ORDER = ['definite', 'probable', 'possible', 'weak'] as const;
const GRADE_LABEL: Record<string, string> = {
  definite: 'Definite',
  probable: 'Probable',
  possible: 'Possible',
  weak: 'Weak',
};

const GRADE_COLOR: Record<string, string> = {
  definite: 'var(--sev-definite)',
  probable: 'var(--sev-probable)',
  possible: 'var(--sev-neutral)',
  weak: 'var(--ink-tertiary)',
};

function numberValue(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return dateKey(d);
}

function compactDate(label: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(`${label}T00:00:00Z`));
}

function isFlagged(tx: TransactionChartData) {
  const grade = tx.identity_confidence_grade ?? tx.match_status ?? '';
  return ['definite', 'probable'].includes(grade) || ['critical', 'high'].includes(tx.risk_level ?? '') || numberValue(tx.identity_score ?? tx.match_score) >= 72;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--surface-border)',
        color: 'var(--ink-primary)',
        boxShadow: 'var(--shadow-2)',
      }}
    >
      {label && <div className="mb-1 font-semibold">{label}</div>}
      <div className="space-y-0.5">
        {payload.map((item) => (
          <div key={item.dataKey ?? item.name} className="flex items-center justify-between gap-5">
            <span style={{ color: item.color ?? 'var(--ink-secondary)' }}>{item.name}</span>
            <span className="font-mono" style={{ color: 'var(--ink-primary)' }}>
              {typeof item.value === 'number' ? item.value.toLocaleString('en-GB', { maximumFractionDigits: 2 }) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ message = 'No data for this range.' }: { message?: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed" style={{ borderColor: 'var(--surface-border)', color: 'var(--ink-tertiary)' }}>
      <p className="text-caption">{message}</p>
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  values,
  onChange,
}: {
  value: T;
  values: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-input)' }}>
      {values.map((item) => (
        <button
          key={String(item)}
          type="button"
          onClick={() => onChange(item)}
          className={cn('h-6 min-w-10 rounded-sm px-2 text-[11px] font-semibold uppercase transition-colors')}
          style={{
            background: item === value ? 'var(--copper-bright)' : 'transparent',
            color: item === value ? 'var(--ink-inverse)' : 'var(--ink-secondary)',
          }}
        >
          {String(item)}
        </button>
      ))}
    </div>
  );
}

export default function DashboardCharts({ runs, transactions }: Props) {
  const [range, setRange] = useState<RangeDays>(30);
  const [volumeMode, setVolumeMode] = useState<VolumeMode>('daily');

  const normalized = useMemo(() => (
    transactions
      .map((tx) => ({ ...tx, date: new Date(tx.processed_at), score: numberValue(tx.identity_score ?? tx.match_score) }))
      .filter((tx) => Number.isFinite(tx.date.getTime()))
  ), [transactions]);

  const maxDate = useMemo(() => {
    const max = normalized.reduce((latest, tx) => Math.max(latest, tx.date.getTime()), 0);
    return max ? new Date(max) : new Date();
  }, [normalized]);

  const ranged = useMemo(() => {
    const start = new Date(maxDate);
    start.setUTCDate(start.getUTCDate() - range + 1);
    start.setUTCHours(0, 0, 0, 0);
    return normalized.filter((tx) => tx.date >= start && tx.date <= maxDate);
  }, [maxDate, normalized, range]);

  const fraudRate = useMemo(() => {
    const buckets = new Map<string, { label: string; total: number; flagged: number }>();
    for (let i = range - 1; i >= 0; i -= 1) {
      const d = new Date(maxDate);
      d.setUTCDate(d.getUTCDate() - i);
      const key = dateKey(d);
      buckets.set(key, { label: compactDate(key), total: 0, flagged: 0 });
    }
    for (const tx of ranged) {
      const key = dateKey(tx.date);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (isFlagged(tx)) bucket.flagged += 1;
    }
    return [...buckets.values()].map((bucket) => ({
      ...bucket,
      rate: bucket.total ? Number(((bucket.flagged / bucket.total) * 100).toFixed(2)) : 0,
    }));
  }, [maxDate, range, ranged]);

  const volume = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number; value: number }>();
    for (const tx of ranged) {
      const key = volumeMode === 'weekly' ? weekKey(tx.date) : dateKey(tx.date);
      const bucket = buckets.get(key) ?? { label: volumeMode === 'weekly' ? `W/c ${compactDate(key)}` : compactDate(key), count: 0, value: 0 };
      bucket.count += 1;
      bucket.value += numberValue(tx.order_value);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, bucket]) => bucket);
  }, [ranged, volumeMode]);

  const gradeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of normalized) {
      const grade = tx.identity_confidence_grade ?? 'weak';
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
    return GRADE_ORDER.map((grade) => ({ name: GRADE_LABEL[grade], grade, value: counts.get(grade) ?? 0 }));
  }, [normalized]);

  const chargebackTrend = useMemo(() => {
    const buckets = new Map<string, { label: string; total: number; chargebacks: number }>();
    for (const tx of ranged) {
      const key = weekKey(tx.date);
      const bucket = buckets.get(key) ?? { label: `W/c ${compactDate(key)}`, total: 0, chargebacks: 0 };
      bucket.total += 1;
      if (tx.chargeback_filed) bucket.chargebacks += 1;
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, bucket]) => ({
      ...bucket,
      rate: bucket.total ? Number(((bucket.chargebacks / bucket.total) * 100).toFixed(2)) : 0,
      benchmark: 1.5,
    }));
  }, [ranged]);

  const topSignals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of normalized) {
      const signalSet = [...(tx.signals_matched ?? []), ...(tx.fraud_flags ?? [])];
      for (const signal of signalSet) counts.set(signal, (counts.get(signal) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([signal, count]) => ({ signal: signal.replace(/_/g, ' '), count }));
  }, [normalized]);

  const riskDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    for (const tx of normalized) {
      const bucket = buckets.find((item) => tx.score >= item.min && tx.score <= item.max) ?? buckets[0];
      bucket.count += 1;
    }
    return buckets;
  }, [normalized]);

  if (runs.length === 0 && transactions.length === 0) {
    return (
      <div className="border-t p-4" style={{ borderColor: 'var(--surface-border)' }}>
        <EmptyChart message="Run an audit to populate dashboard trends." />
      </div>
    );
  }

  return (
    <div className="border-t p-4" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-overline" style={{ color: 'var(--ink-tertiary)' }}>Transaction intelligence</p>
          <p className="text-caption mt-1" style={{ color: 'var(--ink-secondary)' }}>
            {transactions.length.toLocaleString()} seeded transactions, refreshed from merchant-owned audits.
          </p>
        </div>
        <Segmented<RangeDays> value={range} values={[30, 60, 90]} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
        <SectionCard title="Fraud Rate Over Time" description={`${range} day transaction flag rate`} className="xl:col-span-3">
          {fraudRate.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={fraudRate} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--surface-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v))}%`} tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--copper-bright)', strokeOpacity: 0.25 }} />
                <Line name="Fraud rate" type="monotone" dataKey="rate" stroke="var(--copper-bright)" strokeWidth={2.25} dot={false} activeDot={{ r: 4, fill: 'var(--copper-bright)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </SectionCard>

        <SectionCard
          title="Transaction Volume"
          description="Daily or weekly completed order volume"
          actions={<Segmented<VolumeMode> value={volumeMode} values={['daily', 'weekly']} onChange={setVolumeMode} />}
          className="xl:col-span-3"
        >
          {volume.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={volume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={volumeMode === 'weekly' ? 28 : 10}>
                <CartesianGrid stroke="var(--surface-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={18} />
                <YAxis tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--copper-bright) 8%, transparent)' }} />
                <Bar name="Transactions" dataKey="count" fill="var(--privacy-ink)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </SectionCard>

        <SectionCard title="Identity Match Breakdown" description="Confidence grade distribution" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={gradeBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                {gradeBreakdown.map((entry) => <Cell key={entry.grade} fill={GRADE_COLOR[entry.grade]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--ink-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Chargeback Rate Trend" description="Weekly rate with 1.5% benchmark" className="xl:col-span-2">
          {chargebackTrend.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chargebackTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--surface-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={14} />
                <YAxis tickFormatter={(v) => `${Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`} tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
                <ReferenceLine y={1.5} stroke="var(--ink-tertiary)" strokeDasharray="4 4" label={{ value: 'benchmark', fill: 'var(--ink-tertiary)', fontSize: 10, position: 'insideTopRight' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--sev-probable)', strokeOpacity: 0.25 }} />
                <Line name="Chargeback rate" type="monotone" dataKey="rate" stroke="var(--sev-probable)" strokeWidth={2.25} dot={false} activeDot={{ r: 4, fill: 'var(--sev-probable)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </SectionCard>

        <SectionCard title="Risk Score Distribution" description="Histogram across analysed orders" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={riskDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={34}>
              <CartesianGrid stroke="var(--surface-border)" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--privacy-ink) 8%, transparent)' }} />
              <Bar name="Orders" dataKey="count" radius={[4, 4, 0, 0]}>
                {riskDistribution.map((bucket, index) => (
                  <Cell key={bucket.range} fill={index >= 4 ? 'var(--sev-definite)' : index === 3 ? 'var(--sev-probable)' : index === 2 ? 'var(--sev-neutral)' : 'var(--privacy-ink)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Flagged Signals" description="Most common signals in the current data set" className="xl:col-span-6">
          {topSignals.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topSignals} layout="vertical" margin={{ top: 4, right: 16, left: 142, bottom: 0 }} barSize={18}>
                <CartesianGrid stroke="var(--surface-border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--ink-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="signal" tick={{ fill: 'var(--ink-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--copper-bright) 8%, transparent)' }} />
                <Bar name="Signal count" dataKey="count" fill="var(--copper-bright)" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No flagged signals in this data set." />}
        </SectionCard>
      </div>
    </div>
  );
}
