'use client';

export default function DemoBanner() {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-1.5 text-[length:var(--ua-text-caption-size)] leading-[var(--ua-text-caption-leading)] sm:px-6"
      style={{
        background: 'var(--ua-info-bg)',
        borderColor: 'var(--ua-info-border)',
        color: 'var(--ua-info)',
      }}
    >
      <span>
        You&apos;re viewing demo data. Connect your store to see real data.
      </span>
    </div>
  );
}
