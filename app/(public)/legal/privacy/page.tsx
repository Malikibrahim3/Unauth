/**
 * app/(public)/legal/privacy/page.tsx
 *
 * Privacy Policy — static page.
 */

import Link from 'next/link';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata = {
  title: 'Privacy Policy | Unauth',
};

export default function PrivacyPage() {
  return (
    <>
      <LegalHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text)]">Privacy Policy</h1>
      <p className="mb-10 text-sm text-[var(--text-muted)]">Last updated: May 2026</p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">What data is collected</h2>
          <p>
            Unauth collects order, support, claim, outcome, and related commerce data provided by
            merchants through connected systems or legacy imports. This typically includes customer
            names, email addresses, delivery addresses, phone numbers, order identifiers, order
            values, support tickets, refund records, and chargeback records. Where merchants provide
            them, we also process partial card identifiers (last 4 digits and BIN prefix) as
            pseudonymous matching signals - we never receive, store, or process full card numbers,
            CVV codes, or complete card credentials. We also collect standard account information for
            registered merchants (name, email, billing details) and usage logs for the platform itself.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">How it is used</h2>
          <p>
            Merchant-provided data is used to operate Unauth claim review workflows: normalising
            customer identifiers, linking claims to orders and support cases, generating evidence
            packages, applying merchant-owned rules, tracking recovery work, and reporting payout
            outcomes. Data is never used for advertising, sold to third parties, or processed for
            any purpose unrelated to the Unauth service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Who it is shared with</h2>
          <p>
            Raw order data - including customer names, emails, and addresses - is never shared with
            other merchants. Each merchant&rsquo;s data is isolated in a separate database partition
            protected by row-level security that cannot be overridden by application code.
          </p>
          <p className="mt-2">
            <strong>What is processed for reporting:</strong> aggregate payout-control statistics
            such as case counts, payout exposure, evidence status, recovery value, and outcomes.
            These aggregates do not reveal customer names or another merchant&rsquo;s order details.
            This is described in detail in our{' '}
            <Link href="/legal/data-handling" className="underline text-[var(--accent)]">
              data handling guide
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Retention</h2>
          <p>
            Personal data in your merchant silo is retained for 24 months from the date it is provided,
            or until you request deletion, whichever comes first. Operational payout-case and
            recovery records are retained according to the same account policy unless a longer legal
            retention requirement applies. All deletable data is deleted within 30 days of account
            closure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Your rights</h2>
          <p>
            Under the UK GDPR you have the right to: access the personal data we hold about you;
            request correction of inaccurate data; request deletion of your data; object to or
            restrict processing; and data portability. To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@unauth.co" className="underline text-[var(--accent)]">
              privacy@unauth.co
            </a>{' '}
            or use the deletion request option in Settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Cookies and tracking</h2>
          <p>
            Unauth uses session cookies strictly necessary for authentication. No third-party
            advertising trackers or analytics cookies are set. We use privacy-preserving server-side
            analytics only.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Contact</h2>
          <p>
            Data controller:{' '}
            <a href="mailto:privacy@unauth.co" className="underline text-[var(--accent)]">
              privacy@unauth.co
            </a>
            . For DPA enquiries:{' '}
            <a href="mailto:dpa@unauth.co" className="underline text-[var(--accent)]">
              dpa@unauth.co
            </a>
            .
          </p>
        </section>

      </div>

      <div className="mt-12 flex gap-4 text-sm text-[var(--text-muted)]">
        <Link href="/legal/dpa" className="hover:underline">DPA</Link>
        <Link href="/legal/data-handling" className="hover:underline">Data handling</Link>
      </div>
      </div>
    </>
  );
}
