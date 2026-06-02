'use client';

export type GradeDistEntry = {
  label: string;
  count: number;
  color: string;
  key: string;
};

interface GradeDistBarProps {
  grades: GradeDistEntry[];
}

export default function GradeDistBar({ grades }: GradeDistBarProps) {
  const total = grades.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) {
    return (
      <div
        className="h-3 w-full rounded-sm"
        style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Segmented bar */}
      <div className="flex h-3 overflow-hidden rounded-sm" style={{ background: 'var(--bg-surface-alt)' }}>
        {grades.map((g) => {
          const pct = (g.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={g.key}
              style={{ width: `${Math.max(pct, 2)}%`, background: g.color, flexShrink: 0 }}
              title={`${g.label}: ${g.count.toLocaleString()}`}
            />
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex items-center gap-3 flex-wrap">
        {grades.map((g) => (
          <div key={g.key} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-[2px] shrink-0"
              style={{ background: g.color }}
            />
            <span className="text-[10px] leading-none" style={{ color: 'var(--ink-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              {g.label} · {g.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
