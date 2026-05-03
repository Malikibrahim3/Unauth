import Link from 'next/link';

export const metadata = {
  title: 'CSV Export Guide — Unauth',
  description:
    'How to include identity fields in your order export to improve match accuracy.',
};

export default function CsvExportHelpPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      <div>
        <Link
          href="/upload"
          className="text-xs hover:underline"
          style={{ color: 'var(--text-subtle)' }}
        >
          ← Back to upload
        </Link>
        <h1 className="text-display-sm font-bold mt-3" style={{ color: 'var(--text)' }}>
          How to improve your CSV export
        </h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          The more information your export includes, the more accurately we can
          identify patterns. This guide explains which fields to add and how to
          find them.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Why more fields matter                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-heading-md">
          Why more fields matter
        </h2>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          The more information your export includes, the more accurately we can
          tell whether two orders came from the same person. With just an email
          address, someone can open a new Gmail account in 60 seconds and
          appear as a brand-new customer. With a card fingerprint, device ID,
          and IP address together, it becomes very difficult to hide — those
          three pieces of hardware-level data need to change simultaneously,
          which is practically impossible without a new device and a new
          payment card.
        </p>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Every field you add increases the certainty of a match. Even partial
          data helps. Adding just a phone number or billing address moves a
          result from &ldquo;possible&rdquo; to &ldquo;probable&rdquo; when
          combined with soft signals like email patterns.
        </p>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          You only need to do this setup once. Save your new export settings in
          your platform and every future audit will automatically be richer.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Field guide                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-6">
        <h2 className="text-heading-md">Field guide</h2>

        {/* High value */}
        <div className="space-y-4">
          <h3 className="text-overline">
            High-value fields
          </h3>

          <FieldRow
            name="Card last 4 digits"
            fieldKey="card_last4"
            impact="Enables card matching between different email addresses. If the same card appears under two different names, we can surface that pattern."
            shopify="Often included in default Orders exports — look for the 'Credit Card Last 4' column. If it's not there, check your platform's export settings or your PSP's reporting." 
            woo="Available in the standard order export when using WooCommerce Payments. Look for 'Payment method title' or use WP All Export with custom fields."
            other="Most PSPs include last 4 in their transaction exports. Check your payment gateway's reporting portal."
          />

          <FieldRow
            name="IP address"
            fieldKey="ip_address"
            impact="Links orders placed from the same location — particularly useful when someone changes their email and name but uses the same Wi-Fi or mobile network."
            shopify="IP addresses are often visible in the order UI but are NOT included in many default CSV exports. To export in bulk, use a third-party export app or your platform's reporting tools — check platform docs for exact steps."
            woo="Available in the WooCommerce database (stored as order meta). Exportable via WP All Export using the '_customer_ip_address' field."
            other="Check your platform's API documentation or support team for whether IP is available in bulk exports."
          />

          <FieldRow
            name="Customer phone number"
            fieldKey="customer_phone"
            impact="Phone numbers are harder to change than email addresses. A strong corroborating signal — especially when the name varies between orders."
            shopify="Included in most platform order exports. Look for 'Billing Phone' and 'Shipping Phone' columns or equivalent."
            woo="Included in WooCommerce order exports by default."
            other="Virtually all e-commerce platforms include phone in order exports. Check your export columns."
          />

          <FieldRow
            name="Billing address"
            fieldKey="billing_address"
            impact="A systematic mismatch between billing and delivery address can be a meaningful pattern when combined with other signals."
            shopify="Included in many platform order exports. Columns typically include billing street, city, region, postal code and country — check your export columns."
            woo="Included in WooCommerce order exports by default."
            other="Available in most platform exports alongside shipping address."
          />

          <FieldRow
            name="Card fingerprint (PSP token)"
            fieldKey="card_fingerprint"
            impact="The strongest single identity signal. A PSP card token is unique to a card — it identifies the physical card regardless of what email or address is used."
            shopify={
              <>
                <strong>Not available</strong> in standard platform exports.
                Available in{' '}
                <strong>Stripe Dashboard</strong> → Payments → export with the
                &ldquo;Payment method fingerprint&rdquo; column enabled.{' '}
                <strong>Adyen</strong>: Transaction Overview export. Most small
                merchants won&rsquo;t have access to this field.
              </>
            }
            woo="Not available in standard WooCommerce exports. Requires direct PSP-level export from Stripe or similar."
            other="Available through your PSP's reporting portal if they support card fingerprinting. Contact your PSP's support team."
            caveat="This field requires PSP-level exports. Most merchants using hosted payment processors will not have it."
          />

          <FieldRow
            name="Account / customer ID"
            fieldKey="account_id"
            impact="Definitively links multiple orders to the same logged-in account — even if the email changes between orders."
            shopify="Some platforms include an internal customer/account ID in order exports. Check your platform's export for a stable customer identifier."
            woo="Available as 'Customer User ID' in WooCommerce exports via WP All Export."
            other="Check your platform for a stable customer account identifier in order exports."
          />
        </div>

        {/* Medium value */}
        <div className="space-y-4">
          <h3 className="text-overline">
            Medium-value fields
          </h3>

          <FieldRow
            name="Card BIN (first 6–8 digits)"
            fieldKey="card_bin"
            impact="Combined with last 4, creates a near-unique card identifier. Cards with the same BIN and last 4 are almost certainly the same physical card."
            shopify="Not available in many standard platform exports. Available in Stripe Dashboard exports; check your PSP reporting for BIN details."
            woo="Available via direct PSP export."
            other="Check your PSP's reporting portal."
          />

          <FieldRow
            name="Payment method"
            fieldKey="payment_method"
            impact="Useful for detecting patterns — for example, the same digital wallet appearing under different names."
            shopify="Often included as 'Payment Method' in standard order exports." 
            woo="Included as 'Payment method title' in standard WooCommerce exports."
            other="Available in virtually all platform exports."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — What works with limited data                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-heading-md">
          What we can still do with limited data
        </h2>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Even with just the 6 required fields, the engine can still detect
          meaningful patterns:
        </p>
        <ul className="text-body-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
          <li>
            <strong>Email variants</strong> — the same person using{' '}
            <code className="text-xs px-1 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              john@gmail.com
            </code>{' '}
            and{' '}
            <code className="text-xs px-1 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              john+refund@gmail.com
            </code>{' '}
            or{' '}
            <code className="text-xs px-1 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              j.o.h.n@gmail.com
            </code>{' '}
            — caught by email variant detection.
          </li>
          <li>
            <strong>Address clustering</strong> — three orders to the same
            address under different names — caught by address matching.
          </li>
          <li>
            <strong>Name variants</strong> — &ldquo;John Smith&rdquo; and
            &ldquo;Jon Smith&rdquo; — caught by Levenshtein distance matching.
          </li>
          <li>
            <strong>Behavioural patterns</strong> — claiming refunds within
            24 hours repeatedly, or claiming refunds on every order — caught
            by behavioural context analysis.
          </li>
        </ul>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          These signals are real. They&rsquo;re weaker than hardware signals but
          they surface patterns that a manual review would likely miss. Results
          will show as &lsquo;possible&rsquo; confidence — which is honest — but
          they&rsquo;re still actionable.
        </p>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Think of this as your baseline. Every field you add upgrades your
          detection from &lsquo;possible&rsquo; toward &lsquo;probable&rsquo;
          and eventually &lsquo;definite&rsquo;.
        </p>
      </section>

      {/* CE3.0 eligibility section */}
      <section className="space-y-4">
        <h2 className="text-heading-md">Maximising your CE3.0 eligibility</h2>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Visa Compelling Evidence 3.0 (CE3.0) is a chargeback representment framework that came
          into effect in October 2025, covering Visa reason code 10.4. When CE3.0 criteria are met,
          you can submit evidence of prior undisputed transactions to challenge a chargeback — and
          the issuing bank is required to accept it as compelling evidence.
        </p>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          To qualify, your evidence package must contain two prior undisputed orders from the same
          identity, each placed more than 120 days before the disputed transaction, each sharing at
          least two of the following accepted signals with the disputed order:
        </p>
        <ul className="space-y-1 text-body-sm list-none pl-0" style={{ color: 'var(--text-muted)' }}>
          {([
            ['Device fingerprint', 'deviceMatch — requires your platform to capture device ID at checkout'],
            ['IP address cluster', 'ipCluster — IP address or ASN recorded on the order'],
            ['Email address', 'emailVariant — standard checkout field, always captured automatically'],
            ['Billing / shipping address', 'addressCluster — full address including postcode'],
            ['Phone number', 'phoneMatch — mobile or landline recorded at checkout'],
            ['Account linkage', 'accountLink — customer account ID or loyalty programme ID'],
          ] as const).map(([label, detail]) => (
            <li key={label} className="flex gap-2 items-start">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)', marginTop: '0.45rem' }} />
              <span><span className="font-medium" style={{ color: 'var(--text)' }}>{label}</span> — {detail}</span>
            </li>
          ))}
        </ul>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Email is always captured automatically, giving you one signal from day one. Adding device
          fingerprint or IP address alongside billing address will satisfy the two-signal requirement
          for most orders and significantly increase your CE3.0 eligibility rate.
        </p>
        <div className="rounded-lg border px-4 py-3" style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
          <p className="text-body-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
            CE3.0 eligibility is assessed automatically
          </p>
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            When you generate an evidence package from a customer profile, Unauth checks CE3.0
            eligibility in real time and displays whether the disputed order qualifies. View your
            packages in{' '}
            <Link href="/chargebacks" className="hover:underline" style={{ color: 'var(--accent)' }}>
              Evidence Packages
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Link
          href="/upload"
          className="inline-block px-5 py-2.5 text-sm font-semibold rounded-md transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          ← Back to upload
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row sub-component
// ---------------------------------------------------------------------------
interface FieldRowProps {
  name: string;
  fieldKey: string;
  impact: string;
  shopify: React.ReactNode;
  woo: string;
  other: string;
  caveat?: string;
}

function FieldRow({
  name,
  fieldKey,
  impact,
  shopify,
  woo,
  other,
  caveat,
}: FieldRowProps) {
  return (
    <div className="rounded-lg p-4 space-y-3 border" style={{ borderColor: 'var(--border-subtle)' }}>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{name}</h4>
          <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            {fieldKey}
          </code>
        </div>
        <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>{impact}</p>
        {caveat && (
          <p className="text-xs rounded px-2 py-1 mt-2 border" style={{ color: 'var(--risk-high)', background: 'var(--risk-high-bg)', borderColor: 'var(--risk-high-bd)' }}>
            ⚠ {caveat}
          </p>
        )}
      </div>
      <div className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="font-medium" style={{ color: 'var(--text)' }}>Platform (example)</span>
          <span>{shopify}</span>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <span className="font-medium" style={{ color: 'var(--text)' }}>WooCommerce</span>
          <span>{woo}</span>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <span className="font-medium" style={{ color: 'var(--text)' }}>Other</span>
          <span>{other}</span>
        </div>
      </div>
    </div>
  );
}


