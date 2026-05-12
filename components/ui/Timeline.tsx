import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format';

export type TimelineEventType =
  | 'order'
  | 'refund'
  | 'chargeback'
  | 'return'
  | 'address_change'
  | 'email_change'
  | 'account_change'
  | 'high_risk_event'
  | 'note';

export type TimelineEventSeverity = 'info' | 'warning' | 'danger';

export interface TimelineEventItem {
  id: string;
  timestamp: string; // ISO
  type: TimelineEventType;
  title: string;
  description?: string;
  meta?: { label: string; value: string }[];
  severity?: TimelineEventSeverity;
}

interface TimelineProps {
  events: TimelineEventItem[];
  groupByDay?: boolean;
  onEventClick?: (id: string) => void;
  className?: string;
}

const TYPE_COLOR: Record<TimelineEventType, string> = {
  order:           'bg-[var(--accent-100)] text-[var(--accent-600)]',
  refund:          'bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]',
  chargeback:      'bg-[var(--risk-critical-bg)] text-[var(--risk-critical-fg)]',
  return:          'bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]',
  address_change:  'bg-[var(--info-bg)] text-[var(--info-fg)]',
  email_change:    'bg-[var(--info-bg)] text-[var(--info-fg)]',
  account_change:  'bg-[var(--info-bg)] text-[var(--info-fg)]',
  high_risk_event: 'bg-[var(--risk-critical-bg)] text-[var(--risk-critical-fg)]',
  note:            'bg-[var(--bg-surface-alt)] text-[var(--text-tertiary)]',
};

const SEVERITY_RAIL: Record<TimelineEventSeverity, string> = {
  info:    'bg-[var(--info-line)]',
  warning: 'bg-[var(--risk-medium-line)]',
  danger:  'bg-[var(--risk-critical-line)]',
};

function groupEventsByDay(events: TimelineEventItem[]): { day: string; items: TimelineEventItem[] }[] {
  const map = new Map<string, TimelineEventItem[]>();
  for (const ev of events) {
    const day = ev.timestamp.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function Timeline({ events, groupByDay = true, onEventClick, className }: TimelineProps) {
  const groups = groupByDay
    ? groupEventsByDay(events)
    : [{ day: '', items: events }];

  return (
    <div className={cn('', className)}>
      {groups.map(({ day, items }) => (
        <div key={day}>
          {groupByDay && day && (
            <div className="sticky top-0 z-[var(--z-sticky)] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-[var(--space-5)] py-[var(--space-3)]">
              <span className="text-meta text-[var(--text-tertiary)] uppercase">{formatDay(day)}</span>
            </div>
          )}
          <ul className="relative">
            {items.map((ev, i) => {
              const isLast = i === items.length - 1;
              const severity = ev.severity ?? 'info';
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)]',
                    'transition-colors',
                    onEventClick && 'cursor-pointer hover:bg-[var(--bg-hover)]',
                  )}
                  onClick={onEventClick ? () => onEventClick(ev.id) : undefined}
                >
                  {/* Rail */}
                  <div className="relative flex flex-col items-center w-6 shrink-0">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center z-10 text-[10px] font-bold', TYPE_COLOR[ev.type])}>
                      {ev.type === 'order' ? '↑' :
                       ev.type === 'refund' ? '↩' :
                       ev.type === 'chargeback' ? '⚠' :
                       ev.type === 'note' ? '✎' : '·'}
                    </div>
                    {!isLast && (
                      <div className={cn('flex-1 w-px mt-1', SEVERITY_RAIL[severity])} style={{ minHeight: 16 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-[var(--space-2)]">
                    <div className="flex items-baseline justify-between gap-[var(--space-3)]">
                      <p className="text-body-strong text-[var(--text-primary)]">{ev.title}</p>
                      <time className="text-small text-[var(--text-tertiary)] whitespace-nowrap shrink-0">
                        {formatRelativeTime(ev.timestamp)}
                      </time>
                    </div>
                    {ev.description && (
                      <p className="mt-[var(--space-1)] text-small text-[var(--text-secondary)]">{ev.description}</p>
                    )}
                    {ev.meta && ev.meta.length > 0 && (
                      <p className="mt-[var(--space-1)] text-meta text-[var(--text-tertiary)]">
                        {ev.meta.map((m) => `${m.label}: ${m.value}`).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Phase E-3 — HorizontalTimeline
// Feature-flagged by FLAG_RISK_TIMELINE (default-off).
//
// Renders orders + refunds + disputes as a horizontal swimlane on customer
// detail. Extends this module rather than replacing it.
// DOES NOT modify the existing Timeline component above.
// ============================================================================

export interface HorizontalTimelineEvent {
  id: string;
  timestamp: string; // ISO
  type: 'order' | 'refund' | 'chargeback';
  label: string;
  amount?: number;
  currency?: string;
  severity?: TimelineEventSeverity;
}

interface HorizontalTimelineProps {
  events: HorizontalTimelineEvent[];
  onEventClick?: (id: string) => void;
  className?: string;
}

const H_TYPE_ICON: Record<HorizontalTimelineEvent['type'], string> = {
  order:      '↑',
  refund:     '↩',
  chargeback: '⚠',
};

const H_TYPE_COLOR: Record<HorizontalTimelineEvent['type'], { dot: string; label: string }> = {
  order:      { dot: 'var(--accent-500)', label: 'var(--accent-600)' },
  refund:     { dot: 'var(--risk-medium-line)', label: 'var(--risk-medium-fg)' },
  chargeback: { dot: 'var(--risk-critical-line)', label: 'var(--risk-critical-fg)' },
};

function formatHorizontalDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * HorizontalTimeline — phase E-3.
 *
 * Renders a horizontal scrollable swimlane of order/refund/chargeback events.
 * Compose inside a SectionCard or standalone on the customer detail page.
 */
export function HorizontalTimeline({ events, onEventClick, className }: HorizontalTimelineProps) {
  if (events.length === 0) {
    return (
      <p className={cn('text-small text-[var(--text-tertiary)]', className)}>
        No timeline events available.
      </p>
    );
  }

  // Sort ascending so oldest is on the left
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div
      className={cn('relative overflow-x-auto pb-[var(--space-3)]', className)}
      role="list"
      aria-label="Risk timeline"
    >
      {/* Horizontal rail */}
      <div className="absolute left-0 right-0 top-[18px] h-px" style={{ background: 'var(--border-subtle)' }} aria-hidden="true" />

      <ol className="relative flex items-start gap-[var(--space-6)] min-w-max px-[var(--space-2)]">
        {sorted.map((ev) => {
          const colors = H_TYPE_COLOR[ev.type];
          return (
            <li
              key={ev.id}
              role="listitem"
              className={cn(
                'flex flex-col items-center gap-[var(--space-2)] pt-0',
                onEventClick && 'cursor-pointer group',
              )}
              onClick={onEventClick ? () => onEventClick(ev.id) : undefined}
            >
              {/* Dot on rail */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center z-10 text-[10px] font-bold shrink-0 border-2 border-[var(--bg-surface)]"
                style={{ background: colors.dot, color: 'var(--bg-surface)' }}
                title={ev.label}
                aria-hidden="true"
              >
                {H_TYPE_ICON[ev.type]}
              </div>

              {/* Label below dot */}
              <div
                className="flex flex-col items-center gap-[2px] mt-[var(--space-1)]"
                style={{ minWidth: 60, maxWidth: 80 }}
              >
                <time
                  dateTime={ev.timestamp}
                  className="text-mono-sm num text-[var(--text-tertiary)] whitespace-nowrap"
                >
                  {formatHorizontalDate(ev.timestamp)}
                </time>
                <span
                  className="text-meta text-center leading-tight"
                  style={{ color: colors.label }}
                >
                  {ev.label}
                </span>
                {ev.amount != null && (
                  <span className="text-meta num text-[var(--text-secondary)]">
                    {new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: ev.currency ?? 'GBP',
                      maximumFractionDigits: 0,
                    }).format(ev.amount)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
