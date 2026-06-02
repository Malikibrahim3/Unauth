'use client';

import IdentityTimeline from '@/components/customers/IdentityTimeline';
import { Section } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';
import { labelFor } from '@/lib/copy/labels';
import { formatDateMode } from '@/lib/utils/format';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';

export function CustomerIntelligenceDrawerIdentitySection({
  identityTimeline,
  linkedAccounts,
  lastSeen,
}: {
  identityTimeline: CustomerIntelligencePanel['identityTimeline'];
  linkedAccounts: CustomerIntelligencePanel['linkedAccounts'];
  lastSeen: string;
}) {
  if (identityTimeline.length === 0 && linkedAccounts.length === 0) return null;

  return (
    <Section title="Identity trail">
      <div className="flex flex-col gap-2">
        {identityTimeline.length > 0 ? <IdentityTimeline entries={identityTimeline.slice(0, 8)} /> : null}
        {linkedAccounts.slice(0, 5).map((acc, index) => (
          <div key={`${acc.entityType}-${acc.entityValue}-${index}`} className="cid-linked-row">
            <span className="cid-linked-dot" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className={`cid-overline cid-linked-type`}>{labelFor(acc.entityType)}</p>
                <p className="cid-linked-meta">
                  {acc.confidence}% conf. · {formatDateMode(lastSeen, 'recent')}
                </p>
              </div>
              <p className="cid-linked-value">{acc.entityValue}</p>
            </div>
            <span className="cid-chip cid-chip-linked">LINKED</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
