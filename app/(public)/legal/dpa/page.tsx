/**
 * app/(public)/legal/dpa/page.tsx
 *
 * Data Processing Agreement — static page for pilot legal review.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Data Processing Agreement | Unauth',
};

export default function DpaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Contact banner */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold text-blue-800">
          Need a countersigned DPA for your procurement process? Contact{' '}
          <a href="mailto:dpa@unauth.io" className="underline">
            dpa@unauth.io
          </a>{' '}
          and we&apos;ll turn it around within two business days.
        </p>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">Data Processing Agreement</h1>
      <p className="mb-10 text-sm text-gray-500">Last updated: May 2026</p>

      <div className="space-y-10 text-gray-700">

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Parties</h2>
          <p>
            This Data Processing Agreement (&ldquo;DPA&rdquo;) is entered into between the merchant
            entity that has accepted the Unauth Terms of Service (&ldquo;Data Controller&rdquo;) and
            Unauth Ltd, a company incorporated in England and Wales (&ldquo;Processor&rdquo; or
            &ldquo;Unauth&rdquo;). The Controller uploads order data to the Unauth platform; Unauth
            processes that data solely as directed by the Controller.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Subject matter and duration of processing</h2>
          <p>
            Unauth processes personal data provided by the Controller for the purposes set out in
            section 3 below. Processing commences on the date the Controller first uploads data to the
            platform and continues for the duration of the active subscription, plus any retention
            period specified in section 7. Either party may terminate processing by providing 30 days
            written notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Nature and purpose of processing</h2>
          <p>
            Unauth processes order and transaction data to provide identity-matching and refund-abuse
            detection services. Processing activities include normalisation of customer identifiers,
            generation of pseudonymous identity hashes, scoring of transactions against the Unauth
            risk model, and contribution of aggregate identity signals to the Unauth cross-merchant
            network. No plaintext customer identifiers are stored beyond the Controller&rsquo;s own
            data silo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Type of personal data</h2>
          <p>
            The following categories of personal data may be processed: order identifiers and values;
            customer name, email address, delivery address, and phone number (as uploaded by the
            Controller); device identifiers and IP addresses (where present in the uploaded data);
            refund and chargeback history. No special-category data within the meaning of Article 9
            UK GDPR is knowingly processed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Obligations of the Processor (Unauth)</h2>
          <p>
            Unauth shall: process personal data only on documented instructions from the Controller;
            ensure that persons authorised to process the personal data are bound by appropriate
            confidentiality obligations; implement the security measures described in section 8;
            assist the Controller in fulfilling its obligations regarding data subject rights; delete
            or return all personal data at the end of the processing term unless storage is required
            by applicable law; and provide all information necessary to demonstrate compliance with
            this DPA.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Sub-processors</h2>
          <p>
            Unauth uses the following sub-processors: <strong>Supabase Inc.</strong> (database
            infrastructure and storage, hosted in the EU); <strong>Vercel Inc.</strong> (application
            hosting and edge functions, hosted in the EU and US). Controllers are notified of any
            addition or replacement of sub-processors at least 30 days in advance via email, with the
            right to object within that period.
          </p>
          <p className="mt-3">
            We use Amplitude analytics software to track feature usage within the Unauth application.
            No personal customer data is sent to Amplitude — only anonymised merchant behaviour events.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Data subject rights and deletion</h2>
          <p>
            Unauth will assist the Controller in responding to data subject access, erasure, and
            portability requests within the Controller&rsquo;s statutory timeframe. Controllers may
            request deletion of all personal data associated with their account via the Settings page
            or by contacting{' '}
            <a href="mailto:dpa@unauth.io" className="underline text-indigo-600">
              dpa@unauth.io
            </a>
            . Pseudonymous network-graph contributions (hashed identifiers and aggregate counts) are
            retained for 24 months from last contribution date; all other personal data is deleted
            within 30 days of account closure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Security measures</h2>
          <p>
            Unauth implements the following technical and organisational measures: encryption of data
            at rest (AES-256) and in transit (TLS 1.3); row-level security enforced at the database
            layer preventing any cross-tenant data access; HMAC-SHA256 hashing of customer
            identifiers before network contribution; access controls limiting Unauth staff to
            aggregated metrics only; regular penetration testing; incident response procedures with
            72-hour notification to affected Controllers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Data transfers</h2>
          <p>
            Where personal data is transferred outside the UK or EEA, Unauth relies on the
            International Data Transfer Agreement (IDTA) for transfers to the United States via
            sub-processors (Supabase and Vercel). Standard Contractual Clauses (Module 2, Processor
            to Processor) are executed with all relevant sub-processors. Copies are available on
            request to{' '}
            <a href="mailto:dpa@unauth.io" className="underline text-indigo-600">
              dpa@unauth.io
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Contact</h2>
          <p>
            For all data protection and DPA enquiries:{' '}
            <a href="mailto:dpa@unauth.io" className="underline text-indigo-600">
              dpa@unauth.io
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-gray-500">
        <Link href="/legal/privacy" className="hover:underline">Privacy policy</Link>
        <Link href="/legal/data-handling" className="hover:underline">Data handling</Link>
      </div>
    </div>
  );
}
