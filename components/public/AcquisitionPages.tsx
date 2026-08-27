import Link from 'next/link';
import { ArrowRight, Check, CircleCheck, FileCheck2, Headphones, PackageCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { LANDING_PRICING_TIERS } from '@/lib/billing/landingTierChart';
import { BILLABLE_EVENTS, parseRequestedPlanId, PLANS } from '@/lib/billing/plans';
import { PublicShell } from '@/components/system/PublicShell';
import { formatNumber } from '@/lib/utils/format';
import styles from './Acquisition.module.css';

const navigation = (
  <div className={styles.nav}>
    <Link href="/landing#workflow">Workflow</Link>
    <Link href="/demo">Product demo</Link>
    <Link href="/pricing">Pricing</Link>
  </div>
);

const actions = (
  <div className={styles.actions}>
    <Link className={styles.quietAction} href="/login">Sign in</Link>
    <Link className={styles.primaryAction} href="/signup">Create workspace <ArrowRight size={14} aria-hidden="true" /></Link>
  </div>
);

const footer = (
  <nav className={styles.footerNav} aria-label="Legal">
    <Link href="/legal/privacy">Privacy</Link>
    <Link href="/legal/data-handling">Data handling</Link>
    <Link href="/legal/dpa">DPA</Link>
    <Link href="/legal/pilot-terms">Pilot terms</Link>
  </nav>
);

const proofSteps = [
  { icon: Headphones, title: 'Helpdesk request received', body: 'A customer asks for a replacement after a delivery dispute.', time: '09:12' },
  { icon: PackageCheck, title: 'Order and delivery evidence joined', body: 'Shopify, carrier and support records retain source and timestamp.', time: '09:13' },
  { icon: ShieldCheck, title: 'Recommendation explained', body: 'The matched merchant rule and one evidence gap remain visible.', time: '09:14' },
  { icon: FileCheck2, title: 'Merchant decision recorded', body: 'The operator owns the final action; Unauth records the boundary.', time: '09:18' },
  { icon: RotateCcw, title: 'Recovery work handed off', body: 'Responsibility, evidence requirement and deadline stay on the case.', time: '09:20' },
] as const;

export function LandingSurface() {
  return (
    <div className={styles.page}>
      <PublicShell navigation={navigation} actions={actions} footer={footer} surfaceId="acquisition-landing">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Decide every payout with the full evidence in view.</h1>
            <p>Unauth joins commerce, delivery, support and financial records in one merchant-controlled decision ledger—then keeps recovery work and the resulting financial history attached.</p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryAction} href="/signup">Create workspace <ArrowRight size={15} aria-hidden="true" /></Link>
              <Link className={styles.secondaryAction} href="/demo">View demo</Link>
            </div>
            <p className={styles.assurance}><CircleCheck size={15} aria-hidden="true" /> Recommendations stay advisory. Customer, payout and recovery decisions stay with your team.</p>
          </div>

          <div className={styles.proof} aria-label="Synthetic case walkthrough preview">
            <div className={styles.proofTopbar}><strong>Case review · PC-1048</strong><span>Fictional merchant workspace</span></div>
            <div className={styles.proofBody}>
              <aside className={styles.caseContext}>
                <p>Persistent case context</p>
                <h2>Delivered, customer reports not received</h2>
                <dl>
                  <div><dt>Value at issue</dt><dd>£184.00</dd></div>
                  <div><dt>Evidence</dt><dd>4 verified · 1 missing</dd></div>
                  <div><dt>Current boundary</dt><dd>Merchant decision</dd></div>
                  <div><dt>External action</dt><dd>None taken</dd></div>
                </dl>
              </aside>
              <div className={styles.sequence}>
                <div className={styles.sequenceHeader}>
                  <div><h2>One traceable operating sequence</h2><p>Every step keeps its source, owner and consequence separate.</p></div>
                  <span className={styles.synthetic}>Synthetic example</span>
                </div>
                <div className={styles.proofSteps}>
                  {proofSteps.map(({ icon: Icon, title, body, time }) => (
                    <div className={styles.proofStep} key={title}>
                      <span><Icon size={14} aria-hidden="true" /></span>
                      <span><strong>{title}</strong><small>{body}</small></span>
                      <time>{time} UTC</time>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="workflow">
          <div className={styles.sectionInner}>
            <div className={styles.sectionIntro}>
              <h2>One ledger from first evidence to final financial outcome.</h2>
              <p>Operators should not have to reconstruct a payout decision from disconnected dashboards. Unauth keeps source facts, advice, merchant decisions, external actions and ledger consequences visibly distinct while preserving the thread between them.</p>
            </div>
            <div className={styles.capabilities}>
              <div className={styles.capability}><h3>Review the case</h3><p>Bring the customer, order, parcel, ticket, refund and dispute context together with provenance and freshness.</p><Link href="/demo">Walk through a case</Link></div>
              <div className={styles.capability}><h3>Record the decision</h3><p>See the merchant rule and evidence gap before recording the operator-owned outcome and its audit consequence.</p><Link href="/demo?step=decision">See the decision step</Link></div>
              <div className={styles.capability}><h3>Follow the money</h3><p>Keep responsibility, recovery handoff, deadlines, reconciled credits and immutable financial entries connected.</p><Link href="/demo?step=recovery">See recovery handoff</Link></div>
            </div>

            <div className={styles.integrations} aria-label="Supported integrations">
              {['Shopify', 'BigCommerce', 'Gorgias', 'Zendesk', 'Freshdesk', 'ShipBob'].map((provider) => <span className={styles.integration} key={provider}><span aria-hidden="true" />{provider}</span>)}
            </div>

            <div className={styles.principles}>
              <div className={styles.principle}><h3>Evidence remains evidence</h3><p>Missing or stale records stay qualified; they never become a plausible-looking zero.</p></div>
              <div className={styles.principle}><h3>Advice remains advisory</h3><p>A recommendation cannot masquerade as a merchant decision or external action.</p></div>
              <div className={styles.principle}><h3>Money remains traceable</h3><p>Losses, recoveries and reversals remain scoped to source, currency and ledger history.</p></div>
            </div>
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={styles.finalInner}>
            <div><h2>Give every payout decision a record that survives the moment.</h2><p>Create a workspace to connect your operating sources and move from evidence to an auditable next action.</p></div>
            <Link className={styles.primaryAction} href="/signup">Create workspace <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </section>
      </PublicShell>
    </div>
  );
}

function signupHref(key: string) {
  const params = new URLSearchParams({ plan: key });
  return `/signup?${params.toString()}`;
}

export function PricingSurface({
  requestedPlan,
  requestedCredits,
}: {
  requestedPlan?: string;
  requestedCredits?: string;
}) {
  const requestedPlanId = parseRequestedPlanId(requestedPlan);
  const requestedTier = LANDING_PRICING_TIERS.find((tier) => tier.key === requestedPlanId);
  const selectedTier = requestedTier ?? LANDING_PRICING_TIERS.find((tier) => tier.key === 'pro') ?? LANDING_PRICING_TIERS[0];
  const selectedPlan = PLANS[selectedTier.key];
  const invalidPlan = Boolean(requestedPlan && !requestedTier);
  const invalidCredits = Boolean(requestedCredits);
  const selectedCredits = selectedPlan.creditsMonthly === 'custom'
    ? 'Allowance agreed before activation'
    : `${formatNumber(selectedPlan.creditsMonthly)} context credits / month`;

  return (
    <div className={styles.page}>
      <PublicShell navigation={navigation} actions={actions} footer={footer} surfaceId="acquisition-pricing">
        <div className={styles.pricingInner}>
          <div className={styles.pricingIntro}>
            <h1>Choose the operating capacity your team needs.</h1>
            <p>Every plan keeps final decisions with the merchant. Context credits control usage; included features, operating limits, and unavailable boundaries stay explicit.</p>
          </div>

          {(invalidPlan || invalidCredits) ? (
            <p className={styles.unavailable} role="status" data-state-id="pricing-plan-unavailable">
              That plan is not available, or a legacy credit override was supplied. The canonical plan configuration is shown; no billing selection has been applied.
            </p>
          ) : null}

          <div className={styles.selectionBar} aria-label="Current plan selection">
            <p><strong>{selectedTier.name}</strong> · {selectedCredits}</p>
            <Link className={styles.primaryAction} href={signupHref(selectedTier.key)}>Create workspace <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>

          <nav className={styles.capacityRail} aria-label="Plan capacity">
            <p>Compare context capacity</p>
            <div>
              {LANDING_PRICING_TIERS.map((tier) => {
                const credits = PLANS[tier.key].creditsMonthly;
                const selected = tier.key === selectedTier.key;
                return (
                  <Link
                    key={tier.key}
                    href={`/pricing?plan=${encodeURIComponent(tier.key)}`}
                    aria-current={selected ? 'page' : undefined}
                  >
                    <span aria-hidden="true" />
                    <strong>{tier.name}</strong>
                    <small>{credits === 'custom' ? 'Custom volume' : `${formatNumber(credits)} credits`}</small>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className={styles.planGrid}>
            {LANDING_PRICING_TIERS.map((tier) => {
              const recommended = tier.key === 'pro';
              const selected = tier.key === selectedTier.key;
              return (
                <section className={`${styles.plan} ${recommended ? styles.planRecommended : ''} ${selected ? styles.planSelected : ''}`} key={tier.key} aria-label={`${tier.name} plan`} aria-current={selected ? 'true' : undefined}>
                  <div className={styles.planHeader}><h2>{tier.name}</h2>{selected || recommended ? <span className={styles.recommended}>{selected ? (recommended ? 'Selected · Recommended' : 'Selected') : 'Recommended'}</span> : null}</div>
                  <p className={styles.price}>{tier.price}</p>
                  <p className={styles.priceNote}>{tier.priceNote ?? 'Volume and allowance agreed with your team'}</p>
                  <p className={styles.tagline}>{tier.tagline}</p>
                  <ul className={styles.features}>{tier.features.map((feature) => <li key={feature}><Check size={14} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
                  <Link className={selected ? styles.primaryAction : styles.secondaryAction} href={signupHref(tier.key)}>Create workspace <ArrowRight size={14} aria-hidden="true" /></Link>
                </section>
              );
            })}
          </div>

          <div className={styles.pricingNotes}>
            <section>
              <h2>Usage stays legible.</h2>
              <p>A context credit funds a bounded lookup or evidence operation. Credits do not permit Unauth to make a payout decision, contact a customer or submit a recovery request.</p>
              <dl className={styles.creditRows}>
                {Object.values(BILLABLE_EVENTS).map((event) => (
                  <div key={event.id}><dt>{event.label}</dt><dd>{event.credits} {event.credits === 1 ? 'credit' : 'credits'}</dd></div>
                ))}
              </dl>
            </section>
            <section>
              <h2>Common questions</h2>
              <div className={styles.faq}>
                <details><summary>Can we begin on Free?<span aria-hidden="true">+</span></summary><p>Yes. Free is the entry point for occasional case review, with the limits shown above.</p></details>
                <details><summary>Can Unauth make payouts automatically?<span aria-hidden="true">+</span></summary><p>No. Recommendations remain advisory and your team owns the final merchant action.</p></details>
                <details><summary>What happens when credits run out?<span aria-hidden="true">+</span></summary><p>Usage-gated context pauses until the allowance renews, a supported top-up is applied, or the plan changes. Existing records remain available according to the plan.</p></details>
              </div>
            </section>
          </div>
        </div>
      </PublicShell>
    </div>
  );
}
