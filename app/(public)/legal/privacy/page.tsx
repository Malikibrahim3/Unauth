/** Privacy Policy — static page. */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/public/LegalDocument';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata: Metadata = {
  title: 'Privacy Policy | Unauth',
  description: 'Unauth privacy policy for merchant, customer, and platform data.',
};

const CONTENTS = [
  { href: '#collection', label: 'What data is collected' },
  { href: '#use', label: 'How it is used' },
  { href: '#sharing', label: 'Who it is shared with' },
  { href: '#retention', label: 'Retention' },
  { href: '#rights', label: 'Your rights' },
  { href: '#cookies', label: 'Cookies and tracking' },
  { href: '#contact', label: 'Contact' },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <LegalHeader currentPath="/legal/privacy" />
      <LegalDocument title="Privacy Policy" updated="Last updated: May 2026" contents={CONTENTS}>
        <section id="collection">
          <h2>What data is collected</h2>
          <p>Unauth collects order, support, claim, outcome, and related commerce data provided by merchants through connected systems or legacy imports. This typically includes customer names, email addresses, delivery addresses, phone numbers, order identifiers, order values, support tickets, refund records, and chargeback records. Where merchants provide them, we also process partial card identifiers (last 4 digits and BIN prefix) as pseudonymous matching signals - we never receive, store, or process full card numbers, CVV codes, or complete card credentials. We also collect standard account information for registered merchants (name, email, billing details) and usage logs for the platform itself.</p>
        </section>
        <section id="use">
          <h2>How it is used</h2>
          <p>Merchant-provided data is used to operate Unauth claim review workflows: normalising customer identifiers, linking claims to orders and support cases, generating evidence packages, applying merchant-owned rules, tracking recovery work, and reporting payout outcomes. Data is never used for advertising, sold to third parties, or processed for any purpose unrelated to the Unauth service.</p>
        </section>
        <section id="sharing">
          <h2>Who it is shared with</h2>
          <p>Raw order data - including customer names, emails, and addresses - is never shared with other merchants. Each merchant&rsquo;s data is isolated in a separate database partition protected by row-level security that cannot be overridden by application code.</p>
          <p><strong>What is processed for reporting:</strong> aggregate payout-control statistics such as case counts, payout exposure, evidence status, recovery value, and outcomes. These aggregates do not reveal customer names or another merchant&rsquo;s order details. This is described in detail in our <Link href="/legal/data-handling">data handling guide</Link>.</p>
        </section>
        <section id="retention">
          <h2>Retention</h2>
          <p>Personal data in your merchant silo is retained for 24 months from the date it is provided, or until you request deletion, whichever comes first. Operational payout-case and recovery records are retained according to the same account policy unless a longer legal retention requirement applies. All deletable data is deleted within 30 days of account closure.</p>
        </section>
        <section id="rights">
          <h2>Your rights</h2>
          <p>Under the UK GDPR you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict processing; and data portability. To exercise any of these rights, contact us at <a href="mailto:privacy@unauth.co">privacy@unauth.co</a> or use the deletion request option in Settings.</p>
        </section>
        <section id="cookies">
          <h2>Cookies and tracking</h2>
          <p>Unauth uses session cookies strictly necessary for authentication. No third-party advertising trackers or analytics cookies are set. We use privacy-preserving server-side analytics only.</p>
        </section>
        <section id="contact">
          <h2>Contact</h2>
          <p>Data controller: <a href="mailto:privacy@unauth.co">privacy@unauth.co</a>. For DPA enquiries: <a href="mailto:dpa@unauth.co">dpa@unauth.co</a>.</p>
        </section>
      </LegalDocument>
    </>
  );
}
