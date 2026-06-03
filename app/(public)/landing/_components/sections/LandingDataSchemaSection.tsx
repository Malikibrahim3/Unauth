import Reveal from '../Reveal';

const SCHEMA_CATEGORIES = [
  { label: 'Identity', sensitive: true, fields: ['email', 'phone', 'shipping_name', 'billing_name', 'customer_id'] },
  { label: 'Order', fields: ['order_id', 'order_date', 'order_value', 'item_count', 'sku / category'] },
  { label: 'Address', sensitive: true, fields: ['shipping_address', 'shipping_postcode', 'billing_address', 'billing_postcode'] },
  { label: 'Payment', sensitive: true, fields: ['payment_method', 'card_bin', 'card_last4'] },
  { label: 'Fulfillment', fields: ['carrier', 'tracking_number', 'delivery_status'] },
  { label: 'Abuse signals', fields: ['refund_requested', 'refund_reason', 'return_reason', 'chargeback_status'] },
  { label: 'Support', fields: ['ticket_id', 'claim_type', 'ticket_status', 'first_message_at'] },
] as const;

const COMING_SOON_FIELDS = ['device_fingerprint', 'browser_fingerprint', 'session_id', 'checkout_timestamp'] as const;

export function LandingDataSchemaSection() {
  return (
    <>
      <section className="ua-landing-section-bg">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16">
          <Reveal delay={40} className="ua-landing-schema-reveal-header">
            <div>
              <p className="ua-landing-schema-section-eyebrow">DATA MODEL</p>
              <h2 className="ua-landing-schema-section-title">Use the data your store and helpdesk already produce.</h2>
            </div>
            <p className="ua-landing-schema-section-aside">
              Live integrations keep order, fulfillment, refund, claim, and support context current. CSV backfill fills historical gaps.
            </p>
          </Reveal>

          <Reveal delay={120} className="ua-hover-glow ua-landing-schema-panel">
            <div className="ua-landing-schema-panel-header">
              <div className="ua-landing-schema-panel-header-left">
                <span className="ua-landing-schema-live-dot" />
                <span className="ua-landing-schema-panel-title">● LIVE SOURCES + HISTORICAL BACKFILL</span>
              </div>
              <span className="ua-landing-schema-panel-meta">shopify · woocommerce · bigcommerce · gorgias · zendesk · freshdesk</span>
            </div>
            <p className="ua-landing-schema-panel-note">
              Works with partial data - every additional field strengthens identity confidence. Nothing is mandatory.
            </p>
            {SCHEMA_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="ua-schema-row ua-landing-schema-data-row grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)]"
              >
                <div className="ua-landing-schema-row-label-col sm:[border-right:1px_solid_var(--landing-dark-border-2)]">
                  <span
                    className={`ua-landing-schema-row-label ${'sensitive' in cat && cat.sensitive ? 'ua-landing-schema-row-label--sensitive' : 'ua-landing-schema-row-label--neutral'}`}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="ua-landing-schema-row-fields">
                  {cat.fields.map((f) => (
                    <span
                      key={f}
                      className={`ua-schema-chip ua-landing-schema-chip-dark ${'sensitive' in cat && cat.sensitive ? 'ua-landing-schema-chip-dark--sensitive' : 'ua-landing-schema-chip-dark--neutral'}`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>

          <Reveal delay={200} className="ua-hover-glow ua-landing-schema-coming-row grid grid-cols-1 md:grid-cols-[auto_1fr_auto]">
            <div className="ua-landing-schema-coming-label-col">
              <p className="ua-landing-schema-coming-caption">◯ CHECKOUT EMBED - COMING SOON</p>
            </div>
            <div className="ua-landing-schema-chip-fields">
              {COMING_SOON_FIELDS.map((f) => (
                <span key={f} className="ua-schema-chip ua-landing-schema-chip-dark ua-landing-schema-chip-dark--neutral">
                  {f}
                </span>
              ))}
            </div>
            <p className="ua-landing-schema-coming-note md:text-right">
              Captures device, session, and behavioural signals at the moment of transaction - stronger identity links, no CSV needed.
            </p>
          </Reveal>
        </div>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}
