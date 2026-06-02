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
    { label: 'Dispute-ready', count: ready, color: 'var(--sev-clear)' },
    { label: 'In progress', count: inProgress, color: 'var(--sev-probable)' },
    { label: 'Needs attention', count: missing, color: 'var(--border-default)' },
  ];

  return (
    <div className="space-y-2.5">
      {/* Stacked horizontal bar */}
      <div className="flex h-4 overflow-hidden rounded-sm" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>
        {segments.map((seg) => {
          const pct = (seg.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              style={{ width: `${Math.max(pct, 2)}%`, background: seg.color, flexShrink: 0 }}
              title={`${seg.label}: ${seg.count}`}
            />
          );
        })}
      </div>
      {/* Count labels */}
      <div className="flex items-center gap-4 flex-wrap">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[2px] shrink-0"
              style={{ background: seg.color, border: seg.color === 'var(--border-default)' ? '1px solid var(--border-default)' : undefined }}
            />
            <span className="text-xs" style={{ color: 'var(--ink-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              <span className="font-semibold num" style={{ color: 'var(--ink-primary)' }}>{seg.count}</span>
              {' '}{seg.label}
            </span>
          </div>
        ))}
        <span className="text-xs ml-auto" style={{ color: 'var(--ink-tertiary)' }}>
          {total} total
        </span>
      </div>
    </div>
  );
}
