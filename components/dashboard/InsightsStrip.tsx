'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface Insight {
  text: string;
  level?: 'info' | 'warn' | 'positive';
  href?: string;
  cta?: string;
}

interface InsightsStripProps {
  insights: Insight[];
}

function colorFor(level: Insight['level']) {
  if (level === 'warn') return { bg: 'var(--warning-bg)', border: 'var(--warning-bd)', text: 'var(--warning)', dot: 'var(--warning)' };
  if (level === 'positive') return { bg: 'var(--success-bg)', border: 'var(--success-bd)', text: 'var(--success)', dot: 'var(--success)' };
  return { bg: 'var(--info-bg)', border: 'var(--info-bd)', text: 'var(--info)', dot: 'var(--info)' };
}

export default function InsightsStrip({ insights }: InsightsStripProps) {
  if (!insights.length) return null;

  return (
    <div className="mb-6 space-y-2">
      {insights.map((ins) => {
        const c = colorFor(ins.level);
        const insightKey = ins.href ?? ins.text;
        const inner = (
          <div
            className={`flex items-start gap-2.5 px-4 py-2.5 rounded-md border text-body-sm ${ins.href ? 'cursor-pointer hover:brightness-95 transition-[filter]' : ''}`}
            style={{ background: c.bg, borderColor: c.border, color: c.text }}
          >
            <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
            <span className="flex-1">{ins.text}</span>
            {ins.href && (
              <span className="flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 opacity-70 hover:opacity-100">
                {ins.cta ?? 'View'} <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        );
        return ins.href ? (
          <Link key={insightKey} href={ins.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={insightKey}>{inner}</div>
        );
      })}
    </div>
  );
}
