'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrencyNullable, formatDateMode } from '@/lib/utils/format';

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
}

interface BehaviorRoadmapProps {
  events: BehaviorRoadmapEvent[];
}

const GLYPHS: Record<BehaviorRoadmapEventType, { symbol: string; color: string }> = {
  order_placed: { symbol: '▣', color: '#1A1814' },
  order_refunded: { symbol: '▢', color: '#7B2D26' },
  chargeback_filed: { symbol: '●', color: '#7B2D26' },
  identity_change: { symbol: '▲', color: '#7B2D26' },
  watchlist_add: { symbol: '★', color: '#7B2D26' },
  cross_merchant_signal: { symbol: '◆', color: '#1A1814' },
  note_added: { symbol: '-', color: '#888078' },
};

export default function BehaviorRoadmap({ events }: BehaviorRoadmapProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const density = Array.from({ length: 12 }, () => 0);

  for (const event of events) {
    const diffDays = Math.floor((Date.now() - new Date(event.date).getTime()) / 86400000);
    const weekIndex = Math.min(11, Math.max(0, 11 - Math.floor(diffDays / 7)));
    density[weekIndex] += 1;
  }

  const maxDensity = Math.max(...density, 1);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid var(--border-default)', borderRadius: 4 }}>
      <div style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-default)', padding: '10px 14px' }}>
        <div className="flex items-center justify-between gap-3">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: 1 }}>
            <span aria-hidden="true" className="ua-section-dot" />
            Behavior Roadmap
          </div>
          <div className="num" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{events.length} events</div>
        </div>
        <div className="mt-3 flex gap-1">
          {density.map((value, index) => (
            <span
              key={index}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 2,
                background: `rgba(123, 45, 38, ${0.15 + (value / maxDensity) * 0.85})`,
              }}
            />
          ))}
        </div>
      </div>

      <ol className="p-4 space-y-0">
        {events.map((event, index) => {
          const glyph = GLYPHS[event.type];
          const expanded = expandedId === event.id;
          return (
            <li key={event.id} className="relative pl-8 pb-4 last:pb-0">
              {index < events.length - 1 && (
                <span aria-hidden="true" style={{ position: 'absolute', left: 8, top: 18, bottom: -2, width: 1, background: '#D2C9B5' }} />
              )}
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, color: glyph.color, fontSize: 16, lineHeight: 1 }}>
                {glyph.symbol}
              </span>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : event.id)}
                className="w-full text-left rounded-sm"
                style={{ background: 'transparent' }}
              >
                <div className="grid grid-cols-[92px_1fr_auto] gap-3 items-start">
                  <div className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4A4640' }}>
                    {formatDateMode(event.date, 'table')}
                  </div>
                  <div className="min-w-0">
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1814' }}>{event.title}</div>
                    {event.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{event.subtitle}</div>}
                    {!expanded && event.evidence?.length ? (
                      <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 3 }}>
                        {event.evidence.slice(0, 3).join(' · ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {event.amount != null && (
                      <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1A1814' }}>
                        {formatCurrencyNullable(event.amount)}
                      </span>
                    )}
                    {event.tier && <Badge tone={event.tier === 'critical' ? 'critical' : event.tier === 'high' ? 'danger' : 'neutral'}>{event.tier}</Badge>}
                  </div>
                </div>
                {expanded && (
                  <div style={{ marginTop: 8, padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 3, background: 'var(--bg-canvas)' }}>
                    {event.detail && <div style={{ fontSize: 11, color: '#1A1814' }}>{event.detail}</div>}
                    {event.evidence?.length ? (
                      <div style={{ marginTop: event.detail ? 6 : 0, fontSize: 10, color: 'var(--text-muted)' }}>
                        {event.evidence.join(' · ')}
                      </div>
                    ) : null}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
