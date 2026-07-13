'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PanelCard, StatusBadge } from '@/components/ui';
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
    <PanelCard variant="app" className="overflow-hidden p-0">
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Order & claim history</p>
          <p className="t-mono" style={{ color: 'var(--text-secondary)' }}>{events.length} events</p>
        </div>
        {patternTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {patternTags.map((tag) => (
              <StatusBadge key={tag} variant="held" dot={false}>{tag}</StatusBadge>
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
    </PanelCard>
  );
}
