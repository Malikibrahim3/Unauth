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
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Segmented bar */}
      <div className="relative flex h-6 overflow-hidden rounded-md ua-bar is-visible" style={{ background: 'var(--surface-sunken)' }}>
        {grades.map((g) => {
          const pct = (g.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={g.key}
              className="relative flex items-center justify-center overflow-hidden"
              style={{ width: `${Math.max(pct, 2)}%`, background: g.color, flexShrink: 0 }}
              title={`${g.label}: ${g.count.toLocaleString()} (${pct.toFixed(1)}%)`}
            >
              {pct >= 14 && (
                <span className="text-[10px] font-semibold leading-none select-none" style={{ color: 'color-mix(in srgb, white 90%, transparent)' }}>
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
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
            <span className="text-xs leading-none" style={{ color: 'var(--text-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              {g.label} · {g.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
