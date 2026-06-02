import Link from 'next/link';
import Reveal from '../Reveal';
import { SHOPIFY_STEPS } from '../../landingPageConstants';

export function LandingShopifySection() {
  return (
    <>
      <section
        id="how-it-works"
        className="ua-landing-section-bg mx-auto max-w-[1400px] px-6 md:px-10 pt-14 md:pt-16 pb-10 md:pb-12"
      >
        <Reveal delay={40} className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 items-start">
          <div>
            <p className="ua-landing-schema-section-eyebrow">
              § 2 - SHOPIFY INTEGRATION
            </p>
            <h2 className="ua-landing-shopify-title">
              Connect Shopify in under a minute.
            </h2>
            <p className="ua-landing-shopify-body">
              No engineering lift. Connect once, sync orders and dispute evidence automatically, and move straight into case review.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ua-landing-shopify-chip">Read-only scopes</span>
              <span className="ua-landing-shopify-chip">No checkout changes</span>
              <span className="ua-landing-shopify-chip">No CSV after connect</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/settings/integrations"
                className="ua-landing-link-primary hover:bg-[var(--landing-accent-hover)]"
              >
                Connect Shopify →
              </Link>
              <Link
                href="/demo"
                className="ua-landing-link-secondary hover:underline"
              >
                Watch 30-sec demo
              </Link>
            </div>
          </div>

          <div className="ua-landing-shopify-steps-panel">
            {SHOPIFY_STEPS.map(({ step, title, copy }) => (
              <div key={title} className="ua-landing-shopify-step-row">
                <div className="flex items-start gap-3">
                  <span className="ua-landing-shopify-step-num">{step}</span>
                  <div>
                    <p className="ua-landing-shopify-step-title">{title}</p>
                    <p className="ua-landing-shopify-step-copy">{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

    </>
  );
}
