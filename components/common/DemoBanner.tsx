'use client';

export default function DemoBanner() {
  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 text-sm border-b"
      style={{
        background: 'var(--info-bg)',
        borderColor: 'var(--info-bd)',
        color: 'var(--info)',
      }}
    >
      <span>
        You&apos;re viewing demo data. Connect your store to see real data.
      </span>
    </div>
  );
}
