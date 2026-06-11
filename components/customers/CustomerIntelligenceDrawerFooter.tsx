'use client';

import { CreditCard, FileText, Globe, Mail, MapPin, ShieldCheck, User } from 'lucide-react';
import CustomerNotes from '@/components/audit/CustomerNotes';
import { labelFor } from '@/lib/copy/labels';
import { DetailLine, Section } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';
import type { DrawerProfile } from '@/components/customers/customerIntelligenceDrawerUtils';

export function CustomerIntelligenceDrawerStoredIdentity({
  profile,
}: {
  profile: DrawerProfile;
}) {
  return (
    <Section title="Stored identity details">
      <div className="grid grid-cols-2 gap-3">
        <DetailLine icon={Mail} label="Emails" value={profile.emails.join(', ')} mono />
        <DetailLine icon={User} label="Names" value={profile.names.join(', ')} />
        <DetailLine icon={MapPin} label="Addresses" value={profile.addresses.slice(0, 3).join(' / ')} />
        <DetailLine icon={Globe} label="IP addresses" value={profile.ips.slice(0, 5).join(', ')} mono />
        <DetailLine icon={CreditCard} label="Cards" value={profile.card_last4s.map((c) => `···· ${c}`).join(', ')} mono />
      </div>
    </Section>
  );
}

export function CustomerIntelligenceDrawerEvidenceCta({
  hasProfileId,
  isEligibleForEvidence,
  onBuildEvidence,
}: {
  hasProfileId: boolean;
  isEligibleForEvidence: boolean;
  onBuildEvidence: () => void;
}) {
  return (
    <div className="cid-section">
      {hasProfileId ? (
        <button
          type="button"
          onClick={onBuildEvidence}
          className={`cid-evidence-btn cid-evidence-btn--primary${isEligibleForEvidence ? '' : ' cid-evidence-btn--muted'}`}
          title={isEligibleForEvidence ? undefined : 'No refund or chargeback on record — you can still compile a signal report'}
        >
          <FileText className="cid-icon-14" />
          Build evidence package
        </button>
      ) : (
        <span
          className="cid-evidence-btn--disabled"
          title="Save this customer to a profile before compiling signal data"
        >
          <FileText className="cid-icon-14" />
          Build evidence package
        </span>
      )}
      <p className="cid-evidence-footnote">
        Signal data may help when preparing a dispute response. Confirm what your payment processor needs before you submit.
      </p>
    </div>
  );
}

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
