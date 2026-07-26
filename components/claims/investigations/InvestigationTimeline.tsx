'use client';

import { Clock3, FileCheck2, Send, XCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import type { CaseInvestigation } from '@/lib/investigations/types';
import { formatDateTime } from '@/lib/utils/format';

type TimelineItem = {
  key: string;
  label: string;
  at: string;
  icon: typeof Clock3;
};

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
      icon: Clock3,
    },
  ];
  if (investigation.sent_at) {
    items.push({
      key: 'sent',
      label: 'Request marked sent',
      at: investigation.sent_at,
      icon: Send,
    });
  }
  if (investigation.response_received_at) {
    items.push({
      key: 'response',
      label: 'Response recorded',
      at: investigation.response_received_at,
      icon: FileCheck2,
    });
  }
  if (investigation.closed_at) {
    items.push({
      key: 'closed',
      label: investigation.status === 'cancelled' ? 'Request cancelled' : 'Review closed',
      at: investigation.closed_at,
      icon: investigation.status === 'cancelled' ? XCircle : FileCheck2,
    });
  }

  return (
    <Card unstyled as="ol" variant="muted" className="mt-3 space-y-2 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 text-[var(--ua-text-primary)]">
              <Icon size={13} aria-hidden="true" />
              {item.label}
            </span>
            <time className="text-[var(--ua-text-secondary)]" dateTime={item.at}>
              {formatDateTime(item.at)}
            </time>
          </li>
        );
      })}
    </Card>
  );
}
