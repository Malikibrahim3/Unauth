'use client';

import { ShieldCheck } from 'lucide-react';
import CustomerNotes from '@/components/audit/CustomerNotes';
import { labelFor } from '@/lib/copy/labels';
import { Section } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';

export function CustomerIntelligenceDrawerNarrativeSection({
  narrative,
  hasCleanRecord,
  identitySignals,
}: {
  narrative: string;
  hasCleanRecord: boolean;
  identitySignals: string[];
}) {
  return (
    <Section title="Roadmap summary">
      <div className="cid-narrative-card">
        <div className="flex items-start gap-2">
          <ShieldCheck className="cid-icon-14 shrink-0" style={{ marginTop: 1, color: 'var(--accent)' }} />
          <p className="cid-narrative-text">{narrative}</p>
        </div>
        {!hasCleanRecord && identitySignals.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {identitySignals.map((flag) => (
              <span key={flag} className="cid-chip cid-chip-muted">
                {labelFor(flag)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

export function CustomerIntelligenceDrawerNotesSection({ profileId }: { profileId: string }) {
  return (
    <Section title="Merchant notes">
      <CustomerNotes customerProfileId={profileId} />
    </Section>
  );
}
