import type { Metadata } from 'next';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata: Metadata = {
  title: 'Pilot terms | Unauth',
  description: 'Terms for founding-merchant pilot access.',
};

export default function PilotTermsPage() {
  return (
    <>
      <LegalHeader />
      <div className="min-h-screen px-6 py-16 md:px-10" style={{ background: 'var(--surface-base)', color: 'var(--ink-primary)' }}>
        <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
          Legal
        </p>
        <h1 className="text-4xl font-medium tracking-tight">Pilot terms</h1>
        <div className="space-y-4 text-base leading-7" style={{ color: 'var(--ink-secondary)' }}>
          <p>
            Founding-merchant access is a manual pilot programme for approved merchants only. During the pilot there is no platform fee.
          </p>
          <p>
            Approved merchants agree to participate in a short feedback call, share operational feedback on the product, and allow Unauth to include anonymised order-volume ranges in aggregate network benchmarks.
          </p>
          <p>
            Cross-merchant resolution is enabled only after explicit approval by Unauth. Running a free siloed audit does not grant network access.
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
