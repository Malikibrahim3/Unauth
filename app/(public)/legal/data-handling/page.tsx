/**
 * app/(public)/legal/data-handling/page.tsx
 *
 * Plain-English data flow explanation. The most important legal page for merchant trust.
 */

import Link from 'next/link';

export const metadata = {
  title: 'How Unauth handles your data | Unauth',
};

export default function DataHandlingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text)]">How Unauth handles your data</h1>
      <p className="mb-10 text-sm text-[var(--text-muted)]">
        Plain-English explanation of what we do with your data, what stays private, and what
        contributes to the shared network.
      </p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        {/* Section 1 */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
            1. What stays in your silo
          </h2>
          <ul className="space-y-2">
            {[
              'Your raw order data (customer names, emails, addresses, order values)',
              'Your audit results and evidence packages',
              'Your notes and watchlist',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
            No other merchant can ever access any of this. It is protected by database-level access
            controls that cannot be overridden by application code.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
            2. What contributes to the shared network
          </h2>
          <ul className="space-y-2">
            {[
              'Pseudonymous identity hashes (not raw emails or addresses)',
              'Aggregate statistics per identity (order counts, refund rates — no order details)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--success)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Raw identifiers are hashed using HMAC-SHA256 with a secret salt before they ever leave
            your audit results. The hash is irreversible without the salt, which is never exposed.
          </p>
        </section>

        {/* Section 3 */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
            3. How cross-merchant signals are protected
          </h2>
          <p>
            A cross-merchant signal only surfaces when an identity has been observed at{' '}
            <strong>3 or more distinct merchants</strong> (k-anonymity threshold). Below this
            threshold, no signal fires and no information about other merchants is shared.
          </p>
          <p className="mt-3">
            When a signal does fire, you see only aggregate statistics — never the names of other
            merchants, and never any details from their customers&rsquo; orders.
          </p>
        </section>

        {/* Contact */}
        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-8">
          <p>
            <a
              href="mailto:privacy@unauth.io"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Contact us about data handling: privacy@unauth.io
            </a>
          </p>
          <p>
            <Link
              href="/settings"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Request deletion of your data: Delete my data in Settings →
            </Link>
          </p>
        </div>

      </div>

      <div className="mt-12 flex gap-4 text-sm text-[var(--text-muted)]">
        <Link href="/legal/privacy" className="hover:underline">Privacy policy</Link>
        <Link href="/legal/dpa" className="hover:underline">DPA</Link>
      </div>
    </div>
  );
}
