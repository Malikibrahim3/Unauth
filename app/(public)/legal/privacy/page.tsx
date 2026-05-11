/**
 * app/(public)/legal/privacy/page.tsx
 *
 * Privacy Policy — static page.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Unauth',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text)]">Privacy Policy</h1>
      <p className="mb-10 text-sm text-[var(--text-muted)]">Last updated: May 2026</p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">What data is collected</h2>
          <p>
            Unauth collects order history data uploaded by merchants. This typically includes customer
            names, email addresses, delivery addresses, phone numbers, order identifiers, order
            values, and refund or chargeback records. Where merchants include them in their export,
            we also process partial card identifiers (last 4 digits and BIN prefix) as pseudonymous
            matching signals — we never receive, store, or process full card numbers, CVV codes, or
            complete card credentials. We also collect standard account information for registered
            merchants (name, email, billing details) and usage logs for the platform itself.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">How it is used</h2>
          <p>
            Uploaded order data is used exclusively to operate the Unauth identity-matching engine:
            normalising customer identifiers, scoring transactions for refund-abuse risk, generating
            evidence packages, and contributing pseudonymous identity signals to the Unauth
            cross-merchant network. Data is never used for advertising, sold to third parties, or
            processed for any purpose unrelated to the fraud and refund-abuse detection service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Who it is shared with</h2>
          <p>
            Raw order data — including customer names, emails, and addresses — is never shared with
            other merchants. Each merchant&rsquo;s data is isolated in a separate database partition
            protected by row-level security that cannot be overridden by application code.
          </p>
          <p className="mt-2">
            <strong>What is shared with the network:</strong> pseudonymous identity hashes derived
            from customer identifiers using HMAC-SHA256 (irreversible without the secret salt), and
            aggregate per-identity statistics (order counts, refund rates — never order details or
            customer names). This is described in detail in our{' '}
            <Link href="/legal/data-handling" className="underline text-[var(--accent)]">
              data handling guide
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Retention</h2>
          <p>
            Personal data in your merchant silo is retained for 24 months from the date of upload,
            or until you request deletion, whichever comes first. Pseudonymous network-graph
            contributions are retained for 24 months from last contribution. All data is deleted
            within 30 days of account closure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-[var(--text)]">Your rights</h2>
          <p>
            Under the UK GDPR you have the right to: access the personal data we hold about you;
            request correction of inaccurate data; request deletion of your data; object to or
            restrict processing; and data portability. To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@unauth.io" className="underline text-[var(--accent)]">
              privacy@unauth.io
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
            <a href="mailto:privacy@unauth.io" className="underline text-[var(--accent)]">
              privacy@unauth.io
            </a>
            . For DPA enquiries:{' '}
            <a href="mailto:dpa@unauth.io" className="underline text-[var(--accent)]">
              dpa@unauth.io
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
  );
}
