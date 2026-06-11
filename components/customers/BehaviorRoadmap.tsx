'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';
import { labelFor } from '@/lib/copy/labels';

export type BehaviorRoadmapEventType =
  | 'order_placed'
  | 'order_refunded'
  | 'chargeback_filed'
  | 'identity_change'
  | 'watchlist_add'
  | 'cross_merchant_signal'
  | 'note_added';

export interface BehaviorRoadmapEvent {
  id: string;
  type: BehaviorRoadmapEventType;
  date: string;
  title: string;
  subtitle?: string;
  amount?: number | null;
  tier?: string;
  evidence?: string[];
  detail?: string;
  source?: string | null;
}

interface BehaviorRoadmapProps {
  events: BehaviorRoadmapEvent[];
}

const GLYPHS: Record<BehaviorRoadmapEventType, { symbol: string; color: string; tag?: string }> = {
  order_placed: { symbol: '■', color: 'var(--sev-neutral)' },
  order_refunded: { symbol: '●', color: 'var(--warning)' },
  chargeback_filed: { symbol: '✕', color: 'var(--warning)' },
  identity_change: { symbol: '◆', color: 'var(--warning)' },
  watchlist_add: { symbol: '✓', color: 'var(--neutral)' },
  cross_merchant_signal: { symbol: '◆', color: 'color-mix(in srgb, var(--sev-neutral) 60%, transparent)' },
  note_added: { symbol: '■', color: 'var(--text-tertiary)' },
};

function DensitySvg({ events }: { events: BehaviorRoadmapEvent[] }) {
  const buckets = useMemo(() => {
    const next = Array.from({ length: 18 }, () => ({ total: 0, high: 0 }));
    for (const event of events) {
      const diffDays = Math.floor((Date.now() - new Date(event.date).getTime()) / 86400000);
      const index = Math.min(17, Math.max(0, 17 - Math.floor(diffDays / 5)));
      next[index].total += 1;
      if (event.type === 'chargeback_filed' || event.type === 'order_refunded' || event.tier === 'critical' || event.tier === 'high') {
        next[index].high += 1;
      }
    }
    return next;
  }, [events]);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));

  return (
    <svg className="h-5 w-full" viewBox="0 0 180 20" preserveAspectRatio="none" aria-hidden="true">
      {buckets.map((bucket, index) => {
        const height = Math.max(2, (bucket.total / max) * 18);
        const fill = bucket.total > 0 ? 'var(--text-tertiary)' : 'var(--surface-sunken)';
        return (
          <rect
            key={index}
            x={index * 10 + 1}
            y={20 - height}
            width="6"
            height={height}
            rx="1"
            fill={fill}
            opacity={bucket.total === 0 ? 0.18 : 0.9}
          />
        );
      })}
    </svg>
  );
}

export default function BehaviorRoadmap({ events }: BehaviorRoadmapProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const patternTags = useMemo(() => {
    const tags = new Set<string>();
    for (const event of events) {
      for (const evidence of event.evidence ?? []) {
        tags.add(labelFor(evidence));
      }
    }
    return Array.from(tags).slice(0, 4);
  }, [events]);

  return (
    <div className="overflow-hidden rounded-md border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Order & claim history</p>
          <p className="t-mono" style={{ color: 'var(--text-secondary)' }}>{events.length} events</p>
        </div>
        <div
          className="mt-2 cursor-help"
          title="Event density over 90 days — each bar is a 5-day window of orders and claims"
        >
          <DensitySvg events={events} />
        </div>
        {patternTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {patternTags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm border px-1.5 py-0.5 text-xs font-medium"
                style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <ol className="relative">
        {events.map((event, index) => {
          const glyph = GLYPHS[event.type];
          const expanded = expandedId === event.id;

          return (
            <li
              key={event.id}
              className="relative grid min-h-8 grid-cols-[60px_18px_minmax(0,1fr)_auto] items-start gap-2 border-b px-3 py-2 last:border-b-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <time className="t-mono pt-0.5" style={{ color: 'var(--data-date)' }}>
                {formatDateMode(event.date, 'table')}
              </time>
              <span aria-hidden="true" className="relative flex h-5 items-center justify-center">
                {index < events.length - 1 && (
                  <span className="absolute left-1/2 top-4 h-[calc(100%+16px)] w-px -translate-x-1/2" style={{ background: 'var(--border)' }} />
                )}
                <span style={{ color: glyph.color, fontSize: 12, lineHeight: 1 }}>{glyph.symbol}</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : event.id)}
                className="min-w-0 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-body-sm" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                  {event.amount != null && (
                    <span className="t-mono shrink-0" style={{ color: 'var(--data-currency)' }}>
                      {formatCurrencyNullable(event.amount)}
                    </span>
                  )}
                </div>
                {event.subtitle && (
                  <p className="mt-0.5 truncate t-caption" style={{ color: 'var(--text-tertiary)' }}>{event.subtitle}</p>
                )}
                {expanded && (
                  <div className="mt-2 rounded-sm border px-3 py-2" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                    {event.detail && <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{event.detail}</p>}
                    {event.evidence?.length ? (
                      <p className="mt-1 t-caption" style={{ color: 'var(--text-tertiary)' }}>
                        {event.evidence.map(labelFor).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-2 pt-0.5">
                {event.source && (
                  <span className="rounded-sm border px-1.5 py-0.5 text-xs font-medium uppercase" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                    {event.source}
                  </span>
                )}
                {expanded ? <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
