import type { Metadata } from 'next';
import { LegalDocument } from '@/components/public/LegalDocument';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata: Metadata = {
  title: 'Pilot terms | Unauth',
  description: 'Terms for founding-merchant pilot access.',
};

const CONTENTS = [
  { href: '#access', label: 'Pilot access' },
  { href: '#participation', label: 'Pilot participation' },
  { href: '#network-access', label: 'Network access' },
] as const;

export default function PilotTermsPage() {
  return (
    <>
      <LegalHeader currentPath="/legal/pilot-terms" />
      <LegalDocument title="Pilot terms" contents={CONTENTS}>
        <section id="access">
          <h2>Pilot access</h2>
          <p>Founding-merchant access is a manual pilot programme for approved merchants only. During the pilot there is no platform fee.</p>
        </section>
        <section id="participation">
          <h2>Pilot participation</h2>
          <p>Approved merchants agree to participate in a short feedback call, share operational feedback on the product, and allow Unauth to include anonymised order-volume ranges in aggregate network benchmarks.</p>
        </section>
        <section id="network-access">
          <h2>Network access</h2>
          <p>Cross-merchant resolution is enabled only after explicit approval by Unauth. Running a free siloed audit does not grant network access.</p>
        </section>
      </LegalDocument>
    </>
  );
}
