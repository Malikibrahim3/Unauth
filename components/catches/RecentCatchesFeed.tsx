'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { formatDateMode, formatCurrencyNullable } from '@/lib/utils/format';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { SIGNAL_DISPLAY_LABELS } from '@/lib/catches/types';
import type { IdentityCatchEvent } from '@/lib/catches/types';
import type { ConfidenceGradeValue } from '@/lib/confidence';

function gradeToValue(g: IdentityCatchEvent['confidenceGrade']): ConfidenceGradeValue {
  const map: Record<string, ConfidenceGradeValue> = {
    definite: 'A',
    probable: 'B',
    possible: 'C',
    weak: 'D',
  };
  return (map[g] ?? 'D') as ConfidenceGradeValue;
}

export function RecentCatchesFeed() {
  const [events, setEvents] = useState<IdentityCatchEvent[] | null>(null);

  useEffect(() => {
    void fetch('/api/catches?limit=5')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: IdentityCatchEvent[]) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]));
  }, []);

  return (
    <section
      className="rounded-[10px] border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Module header */}
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Recent identity catches
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Claims where Unauth detected a linked identity through non-obvious signals
            </p>
          </div>
        </div>
        <Link
          href="/catches"
          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Body */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {events === null ? (
          // Loading skeleton
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md"
                style={{ background: 'var(--surface-sunken)' }}
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              No identity catches yet
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Unauth will surface linked-identity moments as claims arrive. Each catch shows the
              matching signals and estimated exposure.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const signalCount = event.matchedSignalTypes.length;
            const firstSignalKey = event.matchedSignalTypes[0];
            const firstSignal = firstSignalKey
              ? (SIGNAL_DISPLAY_LABELS[firstSignalKey] ?? firstSignalKey)
              : null;
            const href = event.profileId
              ? `/customers/${event.profileId}`
              : event.claimId
              ? `/claims?highlight=${event.claimId}`
              : '/catches';

            return (
              <Link
                key={event.id}
                href={href}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-sunken)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <ShieldAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Identity variation detected
                      </p>
                      <ConfidenceBadge
                        grade={gradeToValue(event.confidenceGrade)}
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {signalCount} signal{signalCount === 1 ? '' : 's'}
                      {firstSignal ? ` · ${firstSignal}` : ''}
                      {event.estimatedExposureAmount != null
                        ? ` · ${formatCurrencyNullable(event.estimatedExposureAmount, event.estimatedExposureCurrency)}`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDateMode(event.createdAt, 'recent')}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="mt-1 h-3 w-3 shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-hidden="true"
                />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
