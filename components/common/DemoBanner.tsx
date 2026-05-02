'use client';

import Link from 'next/link';

export default function DemoBanner() {
  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 text-sm border-b"
      style={{
        background: 'var(--risk-high-bg)',
        borderColor: 'var(--risk-high-bd)',
        color: 'var(--risk-high)',
      }}
    >
      <span>
        You&apos;re viewing demo data.{' '}
        <Link href="/upload" className="font-semibold underline" style={{ color: 'var(--risk-high)' }}>
          Upload your own CSV &rarr;
        </Link>{' '}
        to see real data.
      </span>
    </div>
  );
}
