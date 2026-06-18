import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="p-8 max-w-2xl space-y-10">
      <div className="flex items-center gap-3">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-caption transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Help
        </Link>
      </div>

      <section className="space-y-4">
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          How Unauth assembles claim context
        </h1>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          <p>
            When your store and helpdesk are connected, Unauth links claims to the relevant order, ticket,
            customer profile, delivery details, evidence, prior claim history, and merchant rules.
          </p>
          <p>
            Customer identity context is shown as confidence grades rather than a final verdict. A Definite match
            means the strongest available signals overlap. Probable and Possible matches mean there is useful
            context, but the team should review it alongside the rest of the claim record.
          </p>
          <p>
            Unauth does not approve, deny, refund, or close claims automatically. It shows the context and your
            team decides.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-muted)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          How connected sources work together
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          <p>
            Each connected source adds a different part of the story. Shopify contributes orders and fulfillment
            details. Helpdesks contribute tickets, tags, claim language, and support history. Claim outcomes add
            what your team decided previously.
          </p>
          <p>
            The product gets more useful as these sources stay connected because new tickets, orders, evidence,
            and outcomes can be linked back to existing customer and claim history.
          </p>
          <p>
            Legacy imported records may still appear where a merchant already has them, but the current app flow is
            built around connected store and helpdesk data.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-muted)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          How the chargeback evidence works
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          <p>
            When a customer files a chargeback with their bank, you typically have between 20 and 45 days to
            respond with evidence. Without evidence, banks almost always side with the customer.
          </p>
          <p>
            Unauth organises claim, order, identity, and evidence context into a structured view your team can use
            when preparing a dispute response. The report shows the customer&apos;s order pattern and the identity
            signals observed across available records.
          </p>
          <p>
            Unauth surfaces prior matching transactions and identity signals from your records, plus cross-merchant
            pattern indicators where available. When prior orders share signals with a disputed transaction, that
            is highlighted in the identity evidence export.
          </p>
          <p>
            We present identity confidence and claims history for your review. We do not claim any export is
            card-network compliant or guarantees a dispute outcome. Merchants decide how to use the report with
            their acquirer or processor.
          </p>
        </div>
      </section>

      <div
        className="rounded-md px-5 py-4 border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
      >
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Questions? Contact us at{' '}
          <a
            href="mailto:support@unauth.co"
            className="underline underline-offset-2"
            style={{ color: 'var(--text)' }}
          >
            support@unauth.co
          </a>
          .
        </p>
      </div>
    </div>
  );
}
