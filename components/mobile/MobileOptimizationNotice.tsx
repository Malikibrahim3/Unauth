'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Non-blocking banner shown on screens narrower than 1024px (Tailwind `lg` breakpoint).
 * Informs users the app is optimised for larger displays while allowing continued use.
 * Dismissible without reload or redirect.
 */
export default function MobileOptimizationNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="lg:hidden flex items-start justify-between gap-4 px-4 py-2.5 text-sm border-b flex-shrink-0"
      style={{
        background: 'var(--warning-bg)',
        borderColor: 'var(--warning-bd)',
        color: 'var(--warning)',
      }}
      role="status"
      aria-live="polite"
    >
      <p className="leading-snug">
        This app is optimised for screens 1024 px and wider.{' '}
        <Link
          href="/audit"
          className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Try the free CSV audit
        </Link>{' '}
        on smaller devices.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 font-medium underline underline-offset-2 hover:opacity-75 transition-opacity mt-0.5"
        aria-label="Dismiss mobile notice"
        style={{ color: 'inherit' }}
      >
        Dismiss
      </button>
    </div>
  );
}
