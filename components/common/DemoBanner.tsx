'use client';

export default function DemoBanner() {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-1.5 text-[length:var(--uo-route-text-caption-size)] leading-[var(--uo-route-text-caption-leading)] sm:px-6"
      style={{
        background: 'var(--uo-route-info-bg)',
        borderColor: 'var(--uo-route-info-border)',
        color: 'var(--uo-route-info)',
      }}
    >
      <span>
        You&apos;re viewing demo data. Connect your store to see real data.
      </span>
    </div>
  );
}
