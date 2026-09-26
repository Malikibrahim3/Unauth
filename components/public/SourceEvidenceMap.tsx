import Image from 'next/image';
import styles from './public.module.css';

// Public explanatory examples. Runtime identity/capabilities remain in the integration registry.
// Existing asset provenance: public/providers/WORDMARK_SOURCES.md.
const families = [
  { title: 'Orders & earlier payouts', question: 'What was bought? Has it already been refunded?', records: 'Check the items ordered, quantities sent and refunds already recorded.', marks: [ ['Shopify','shopify-dark-wordmark.svg'], ['WooCommerce','woo-wordmark.svg'], ['BigCommerce','bigcommerce-wordmark.svg'] ] },
  { title: 'Customer conversation', question: 'What did the customer say or send?', records: 'Read the messages and available photos together. Keep the customer’s account separate from confirmed facts.', marks: [ ['Gorgias','gorgias-wordmark.svg'], ['Zendesk','zendesk.svg'], ['Intercom','intercom-wordmark.svg'] ] },
  { title: 'Packing & dispatch', question: 'What left the warehouse?', records: 'Available pick/pack records, dispatch events and warehouse exceptions help investigate missing, wrong or damaged items.', marks: [ ['ShipBob','shipbob-wordmark.svg'] ] },
  { title: 'The delivery journey', question: 'What happened between dispatch and delivery?', records: 'Tracking events, delivery scans and proof of delivery where available help establish the shipment timeline. They do not automatically prove liability.', marks: [ ['UPS','ups.svg'], ['FedEx','fedex-wordmark.png'], ['DHL','dhl-wordmark.svg'], ['DPD','dpd-wordmark.png'] ] },
  { title: 'Payment & dispute evidence', question: 'Was the payment refunded or disputed?', records: 'Supported payment records can explain refunds, disputes and settlements. Shopify Payments is the selected evidence scope; a Stripe evidence connection is planned.', marks: [ ['Shopify Payments','shopify-dark-wordmark.svg'], ['Stripe — evidence connection planned','stripe.svg'] ] },
];

export function SourceEvidenceMap() {
  return <div className={styles.sourceMap}>
    <p className={styles.sourceMapQualification}>Illustrative source systems, including pre-launch integrations. Actual evidence depends on the connection, permissions and records available—not every logo represents an available connection.</p>
    <div className={styles.sourceMapRows}>
      {families.map(family => <article key={family.title} className={styles.sourceMapRow}>
        <div><h3>{family.title}</h3><ul className={styles.sourceMapMarks} aria-label={`${family.title} source examples`}>{family.marks.map(([name,file]) => <li key={name}><Image src={`/providers/${file}`} alt={name} width={110} height={32}/>{name === 'Zendesk' && <span>Zendesk</span>}{name === 'Shopify Payments' && <span>Shopify Payments</span>}{name.startsWith('Stripe') && <span>Evidence connection planned</span>}</li>)}</ul></div>
        <div><h4>{family.question}</h4><p>{family.records}</p></div>
      </article>)}
    </div>
    <div className={styles.sourceMapConclusion}><h3>Keep the source behind each fact.</h3><p>Orders, messages and scans answer different questions. Keep them linked to the case, with their source and what is still missing. Your team can use those records again for the decision, the recovery claim and the payment check.</p></div>
  </div>;
}
