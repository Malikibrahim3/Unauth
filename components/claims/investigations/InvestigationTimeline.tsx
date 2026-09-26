'use client';

import { Card } from '@/components/ui';
import type { CaseInvestigation } from '@/lib/investigations/types';
import { formatDateTime } from '@/lib/utils/format';

type TimelineItem = {
  key: string;
  label: string;
  at: string;
  icon: 'clock' | 'sent' | 'file' | 'cancelled';
};

function TimelineIcon({ kind }: { kind: TimelineItem['icon'] }) {
  if (kind === 'sent') return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 2 10 5-10 5 2-5-2-5Z" /><path d="M4 7h8" /></svg>;
  if (kind === 'cancelled') return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m5 5 4 4m0-4-4 4" /></svg>;
  if (kind === 'file') return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 1.8h5l3 3V12H3Z" /><path d="M8 1.8v3h3M5 8l1.2 1.2L9 6.4" /></svg>;
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="M7 4v3.2l2 1.2" /></svg>;
}

export function InvestigationTimeline({
  investigation,
}: {
  investigation: CaseInvestigation;
}) {
  const items: TimelineItem[] = [
    {
      key: 'created',
      label: 'Draft created',
      at: investigation.created_at,
      icon: 'clock',
    },
  ];
  if (investigation.sent_at) {
    items.push({
      key: 'sent',
      label: 'Request marked sent',
      at: investigation.sent_at,
      icon: 'sent',
    });
  }
  if (investigation.response_received_at) {
    items.push({
      key: 'response',
      label: 'Response recorded',
      at: investigation.response_received_at,
      icon: 'file',
    });
  }
  if (investigation.closed_at) {
    items.push({
      key: 'closed',
      label: investigation.status === 'cancelled' ? 'Request cancelled' : 'Review closed',
      at: investigation.closed_at,
      icon: investigation.status === 'cancelled' ? 'cancelled' : 'file',
    });
  }

  return (
    <Card unstyled as="ol" variant="muted" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, padding: 12 }}>
      {items.map((item) => {
        return (
          <li key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#1c1f23' }}>
              <TimelineIcon kind={item.icon} />
              {item.label}
            </span>
            <time style={{ color: '#64686d' }} dateTime={item.at}>
              {formatDateTime(item.at)}
            </time>
          </li>
        );
      })}
    </Card>
  );
}
