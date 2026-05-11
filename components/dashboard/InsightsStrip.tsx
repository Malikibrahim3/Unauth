'use client';

interface Insight {
  text: string;
  level?: 'info' | 'warn' | 'positive';
}

interface InsightsStripProps {
  insights: Insight[];
}

export default function InsightsStrip({ insights }: InsightsStripProps) {
  if (!insights.length) return null;

  function colorFor(level: Insight['level']) {
    if (level === 'warn') return { bg: 'var(--warning-bg, #FFFAEB)', border: 'var(--warning-bd, #FEDF89)', text: 'var(--warning, #B54708)', dot: 'var(--warning)' };
    if (level === 'positive') return { bg: 'var(--success-bg)', border: 'var(--success-bd)', text: 'var(--success)', dot: 'var(--success)' };
    return { bg: 'var(--info-bg)', border: 'var(--info-bd)', text: 'var(--info)', dot: 'var(--info)' };
  }

  return (
    <div className="mb-6 space-y-2">
      {insights.map((ins, i) => {
        const c = colorFor(ins.level);
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg border text-body-sm"
            style={{ background: c.bg, borderColor: c.border, color: c.text }}
          >
            <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
            {ins.text}
          </div>
        );
      })}
    </div>
  );
}
