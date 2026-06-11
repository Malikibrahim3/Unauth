'use client';

interface ReadinessFunnelProps {
  total: number;
  ready: number;
  inProgress: number;
  missing: number;
}

export default function ReadinessFunnel({ total, ready, inProgress, missing }: ReadinessFunnelProps) {
  if (total === 0) return null;

  const segments = [
    { label: 'CE 3.0 ready', count: ready, color: 'var(--neutral)' },
    { label: 'In progress', count: inProgress, color: 'var(--warning)' },
    { label: 'Needs attention', count: missing, color: 'var(--border)' },
  ];

  return (
    <div className="space-y-2.5">
      {/* Stacked horizontal bar */}
      <div className="flex h-8 overflow-hidden rounded-md ua-bar is-visible" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}>
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              className="relative flex items-center justify-center overflow-hidden"
              style={{ width: `${Math.max(pct, 2)}%`, background: seg.color, flexShrink: 0 }}
              title={`${seg.label}: ${seg.count} (${pct.toFixed(1)}%)`}
            >
              {pct >= 12 && (
                <span className="text-[10px] font-semibold leading-none select-none whitespace-nowrap" style={{ color: 'color-mix(in srgb, white 92%, transparent)' }}>
                  {seg.count} · {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Count labels */}
      <div className="flex items-center gap-4 flex-wrap">
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100;
          return (
            <div key={seg.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[2px] shrink-0"
                style={{ background: seg.color, border: seg.color === 'var(--border)' ? '1px solid var(--border)' : undefined }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
                <span className="font-semibold num" style={{ color: 'var(--text-primary)' }}>{seg.count}</span>
                {' '}{seg.label}
                <span style={{ color: 'var(--text-tertiary)' }}> · {pct.toFixed(0)}%</span>
              </span>
            </div>
          );
        })}
        <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          {total} total
        </span>
      </div>
    </div>
  );
}
