import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="p-8 max-w-2xl space-y-10">
      <div className="flex items-center gap-3">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Help
        </Link>
      </div>

      <section className="space-y-4">
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          How Unauth analyses your orders
        </h1>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          <p>
            When you upload an export of your orders, Unauth reads every order and looks for customers who appear
            to be using multiple identities. We compare details like email addresses, shipping addresses, IP
            addresses, and card information across orders to identify accounts that share the same underlying
            customer — even when names and emails are different.
          </p>
          <p>
            Each customer is given a confidence grade rather than a score. A Definite match means we are highly
            confident two or more accounts belong to the same person. A Probable match means we have strong
            evidence but not certainty. A Possible match means there are overlapping signals worth reviewing. A
            Weak match means a single signal was found — treat this as informational only.
          </p>
          <p>
            We never tell you what to do. We show you the pattern and you decide.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          How uploads work together
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>
          <p>
            Each time you upload an export, Unauth adds to what it already knows about your customers. A customer
            who appeared in your January upload will be recognised when they appear in your February upload — even
            if they use a slightly different email or name.
          </p>
          <p>
            This means the product gets more useful the more regularly you upload. A weekly or monthly export
            routine gives you a continuously updated picture of your customer base.
          </p>
          <p>
            You can also run a one-off investigation upload for a specific customer — export every order associated
            with their email from your platform and upload it. Unauth will focus entirely on building that
            customer&apos;s profile.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

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
            Unauth generates a professional evidence document from your order history that you can submit to your
            payment processor or acquirer. The document shows the customer&apos;s order pattern, the identity
            signals linking their accounts, and — where your data qualifies — a submission formatted for Visa&apos;s
            Compelling Evidence 3.0 framework.
          </p>
          <p>
            CE3.0 is a formal Visa policy, active since October 2025, that allows merchants to prove a disputed
            transaction is consistent with a customer&apos;s established purchase history. When your data qualifies,
            Unauth labels the evidence package as CE3.0 eligible and tells you exactly how to submit it.
          </p>
          <p>
            We do not guarantee dispute outcomes. We give you the best possible evidence to present.
          </p>
        </div>
      </section>

      <div
        className="rounded-lg px-5 py-4 border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Questions? Contact us at{' '}
          <a
            href="mailto:support@unauth.io"
            className="underline underline-offset-2"
            style={{ color: 'var(--text)' }}
          >
            support@unauth.io
          </a>
          .
        </p>
      </div>
    </div>
  );
}
