/** Plain-English data-flow explanation for merchant trust. */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/public/LegalDocument';
import { LegalHeader } from '@/components/public/LegalHeader';

export const metadata: Metadata = {
  title: 'How Unauth handles your data | Unauth',
  description: 'A plain-English explanation of how Unauth handles merchant and customer data.',
};

const CONTENTS = [
  { href: '#merchant-silo', label: 'What stays in your silo' },
  { href: '#case-review', label: 'What powers payout-case review' },
  { href: '#customer-records', label: 'How customer records are protected' },
] as const;

export default function DataHandlingPage() {
  return (
    <>
      <LegalHeader currentPath="/legal/data-handling" />
      <LegalDocument
        title="How Unauth handles your data"
        summary="Plain-English explanation of what we do with your data, what stays private, and what powers payout-case review."
        contents={CONTENTS}
      >
        <section id="merchant-silo">
          <h2>1. What stays in your silo</h2>
          <ul>
            {[
              'Your raw order data (customer names, emails, addresses, order values)',
              'Your audit results and evidence packages',
              'Your notes and case context',
            ].map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p><strong>No other merchant can ever access any of this.</strong> It is protected by database-level access controls that cannot be overridden by application code.</p>
        </section>

        <section id="case-review">
          <h2>2. What powers payout-case review</h2>
          <ul>
            {[
              'Support payout case records (ticket, order, requested action, evidence status)',
              'Aggregate operational statistics (payout exposure, outcomes, recovery status)',
            ].map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p>Raw customer records stay merchant-scoped. Unauth uses connected store and helpdesk data to assemble case-level context, evidence checklists, rule outcomes, and recovery reporting for your workspace.</p>
        </section>

        <section id="customer-records">
          <h2>3. How customer records are protected</h2>
          <p>Unauth is designed around merchant-scoped processing. Other merchants cannot access your raw order data, customer identifiers, support tickets, notes, evidence, or payout outcomes.</p>
          <p>Product analytics are aggregated for operations and billing. They do not expose another merchant&rsquo;s customer records, and Unauth does not provide reusable customer denial lists.</p>
          <p><a href="mailto:privacy@unauth.co">Contact us about data handling: privacy@unauth.co</a></p>
          <p><Link href="/settings">Request deletion of your data: Delete my data in Settings →</Link></p>
        </section>
      </LegalDocument>
    </>
  );
}
