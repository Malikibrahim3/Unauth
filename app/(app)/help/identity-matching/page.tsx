import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'How identity matching works — Unauth',
  description:
    'How Unauth links customers across orders using device IDs, IP addresses, card fingerprints and other signals.',
};

interface SignalRowProps {
  name: string;
  uniqueness: 'Very high' | 'High' | 'Medium' | 'Low';
  description: string;
  caveat: string;
}

function UniquenessChip({ uniqueness }: { uniqueness: SignalRowProps['uniqueness'] }) {
  const map: Record<SignalRowProps['uniqueness'], { bg: string; fg: string }> = {
    'Very high': { bg: 'var(--risk-critical-bg)', fg: 'var(--risk-critical-fg)' },
    High:        { bg: 'var(--risk-high-bg)',     fg: 'var(--risk-high-fg)'     },
    Medium:      { bg: 'var(--risk-medium-bg)',   fg: 'var(--risk-medium-fg)'   },
    Low:         { bg: 'var(--risk-low-bg)',       fg: 'var(--risk-low-fg)'     },
  };
  const { bg, fg } = map[uniqueness];
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded font-medium"
      style={{ background: bg, color: fg }}
    >
      {uniqueness} uniqueness
    </span>
  );
}

function SignalRow({ name, uniqueness, description, caveat }: SignalRowProps) {
  return (
    <div
      className="rounded-lg p-5 space-y-2.5 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{name}</span>
        <UniquenessChip uniqueness={uniqueness} />
      </div>
      <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <p className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>
        <span className="not-italic font-medium" style={{ color: 'var(--text-muted)' }}>Caveat: </span>
        {caveat}
      </p>
    </div>
  );
}

export default function IdentityMatchingPage() {
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
          How identity matching works
        </h1>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Unauth identifies customers who are operating multiple accounts by linking orders across your transaction
          history using a layered set of identity signals. This page explains each signal type, how they are
          combined, and the limits of what matching can and cannot prove.
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          The matching pipeline
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <p>
            When an order export is uploaded, each order is parsed into a set of identity tokens — structured
            representations of the identity signals it contains. These tokens are compared against all existing
            orders in your account to find overlapping signals.
          </p>
          <p>
            Overlaps are grouped into candidate identity clusters: sets of accounts that share at least one signal.
            Within each cluster, the quality and quantity of the shared signals determine the confidence grade
            assigned to the customer.
          </p>
          <p>
            The matching logic is deterministic and graph-based — there is no machine learning involved. Every
            link is traceable to a specific signal that appeared in two or more orders.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          Signal types
        </h2>
        <div className="space-y-3">
          <SignalRow
            name="Card fingerprint"
            uniqueness="Very high"
            description="A tokenised representation of the payment card used. Two orders with the same card fingerprint were paid with the same physical card, regardless of the name or email on the account. This is the most reliable linking signal available."
            caveat="Requires your platform or PSP to expose a card fingerprint or token in the export. If only card last 4 is available, the uniqueness is significantly lower — many customers may share the same last 4 digits on different cards."
          />
          <SignalRow
            name="Device ID"
            uniqueness="Very high"
            description="A persistent identifier for the browser or app installation used to place the order. Device IDs are stable across sessions on the same device and do not change when the user clears cookies on most platforms."
            caveat="Not available in all platform exports. Some platforms do not capture device IDs; others expire them after 90 days. If your export does not include a device ID column, this signal will not be used."
          />
          <SignalRow
            name="IP address"
            uniqueness="Medium"
            description="The IP address from which the order was placed. A shared IP address across different accounts can indicate the same household or same device — but it can also indicate a shared office network, university campus, or mobile carrier NAT."
            caveat="IP addresses alone do not constitute strong evidence of identity overlap. They are used as a corroborating signal when combined with card or device data, not as a primary linking signal."
          />
          <SignalRow
            name="Email address pattern"
            uniqueness="High"
            description="Beyond exact email matches, Unauth detects variation patterns such as dot insertion (john.smith vs johnsmith), plus-addressing (user+tag@domain), and character substitution across common patterns used to generate multiple inboxes from a single account."
            caveat="Email pattern analysis is heuristic. It can produce false positives if two unrelated people share a common first name pattern (e.g. j.smith variants). This signal always requires corroboration to produce a Probable or higher grade."
          />
          <SignalRow
            name="Shipping address"
            uniqueness="High"
            description="Orders delivered to the same physical address under different names or accounts. Normalised against common abbreviation patterns (St vs Street, Rd vs Road) and flat/apartment number formatting variations."
            caveat="Shared delivery addresses can reflect household members or commercial address usage (e.g. a PO box or a forwarding service). This signal is treated as corroborating rather than primary."
          />
          <SignalRow
            name="Phone number"
            uniqueness="High"
            description="Normalised phone numbers (international format) matched across accounts. Mobile numbers in particular are tied to physical SIM cards and are difficult to generate in volume."
            caveat="Phone numbers can be recycled by carriers. A match on a phone number that was reassigned in the past 12 months may link two unrelated customers. We do not attempt to detect carrier recycling."
          />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          How signals combine into a grade
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <p>
            Each signal type is weighted by its uniqueness. Card fingerprint and device ID carry the most weight;
            IP address alone carries the least. When signals of different types independently point to the same
            cluster, their evidence multiplies — this is convergence.
          </p>
          <p>
            A{' '}
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Definite</span>{' '}
            grade typically requires convergent evidence from two or more high-uniqueness signal types — for
            example, the same card fingerprint and the same device ID appearing across different email addresses.
          </p>
          <p>
            A{' '}
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Probable</span>{' '}
            grade requires one high-uniqueness signal with at least one corroborating medium-uniqueness signal.
          </p>
          <p>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Possible</span>{' '}
            and{' '}
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Weak</span>{' '}
            grades reflect single-signal or low-uniqueness-only matches.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          What matching cannot prove
        </h2>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Unauth identifies shared signals — it does not prove fraudulent intent. A Definite match means two
          accounts share the same identity; it does not mean those orders were fraudulent chargebacks. The
          analyst's job is to look at the evidence, consider the order history and chargeback record, and make a
          judgement. Unauth surfaces the pattern; you decide what it means.
        </p>
      </section>

      <div className="pt-2">
        <Link
          href="/help"
          className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to Help &amp; Docs
        </Link>
      </div>
    </div>
  );
}
