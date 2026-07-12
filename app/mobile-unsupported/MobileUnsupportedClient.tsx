'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function MobileUnsupportedClient() {
  const [copied, setCopied] = useState(false);
  const desktopUrl = typeof window !== 'undefined' ? window.location.origin : 'https://unauth.co';

  async function copyDesktopLink() {
    try {
      await navigator.clipboard.writeText(desktopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--bg-canvas, #F8F5EE)' }}>
      <section
        className="w-full max-w-lg rounded-2xl border p-8 shadow-sm"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Desktop works best
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
          Reviewing claims, evidence, and customer context works best on a larger screen. Open Unauth on a computer to use the full claim decision workspace.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void copyDesktopLink()}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {copied ? 'Link copied' : 'Copy link for desktop'}
          </button>
          <Link href="/" className="text-center text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
