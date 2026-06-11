'use client';

import Link from 'next/link';

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
        You&apos;re viewing demo data.{' '}
        <Link href="/upload" className="font-semibold underline" style={{ color: 'var(--info)' }}>
          Upload your own CSV &rarr;
        </Link>{' '}
        to see real data.
      </span>
    </div>
  );
}
