/**
 * app/(public)/legal/data-handling/page.tsx
 *
 * Plain-English data flow explanation. The most important legal page for merchant trust.
 */

import Link from 'next/link';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata = {
  title: 'How Unauth handles your data | Unauth',
};

export default function DataHandlingPage() {
  return (
    <>
      <LegalHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text)]">How Unauth handles your data</h1>
      <p className="mb-10 text-sm text-[var(--text-muted)]">
        Plain-English explanation of what we do with your data, what stays private, and what
        powers payout-case review.
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
              'Your notes and case context',
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
            2. What powers payout-case review
          </h2>
          <ul className="space-y-2">
            {[
              'Support payout case records (ticket, order, requested action, evidence status)',
              'Aggregate operational statistics (payout exposure, outcomes, recovery status)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--success)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Raw customer records stay merchant-scoped. Unauth uses connected store and helpdesk
            data to assemble case-level context, evidence checklists, rule outcomes, and recovery
            reporting for your workspace.
          </p>
        </section>

        {/* Section 3 */}
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">
            3. How customer records are protected
          </h2>
          <p>
            Unauth is designed around merchant-scoped processing. Other merchants cannot access
            your raw order data, customer identifiers, support tickets, notes, evidence, or payout
            outcomes.
          </p>
          <p className="mt-3">
            Product analytics are aggregated for operations and billing. They do not expose another
            merchant&rsquo;s customer records, and Unauth does not provide reusable customer denial lists.
          </p>
        </section>

        {/* Contact */}
        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-8">
          <p>
            <a
              href="mailto:privacy@unauth.co"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Contact us about data handling: privacy@unauth.co
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
    </>
  );
}
