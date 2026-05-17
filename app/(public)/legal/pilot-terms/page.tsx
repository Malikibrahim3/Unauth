export default function PilotTermsPage() {
  return (
    <div className="min-h-screen px-6 py-16 md:px-10" style={{ background: '#F8F5EE', color: '#1A1814' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
          Legal
        </p>
        <h1 className="text-4xl font-medium tracking-tight">Pilot terms</h1>
        <div className="space-y-4 text-base leading-7" style={{ color: '#4A4640' }}>
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
  );
}
