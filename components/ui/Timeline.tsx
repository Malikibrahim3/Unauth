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
