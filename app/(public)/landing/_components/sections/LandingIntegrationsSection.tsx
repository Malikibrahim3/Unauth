import Image from 'next/image';
import Reveal from '../Reveal';
import { Lift } from '../ui/Lift';

type Provider = { name: string; src: string; soon?: boolean };

const ORDER_SOURCES: Provider[] = [
  { name: 'Shopify', src: '/integrations/shopify.svg' },
  { name: 'WooCommerce', src: '/integrations/woocommerce.svg' },
  { name: 'BigCommerce', src: '/integrations/bigcommerce.svg' },
  { name: 'Magento', src: '/integrations/magento.svg', soon: true },
];

const HELPDESKS: Provider[] = [
  { name: 'Gorgias', src: '/integrations/gorgias.png' },
  { name: 'Zendesk', src: '/integrations/zendesk.svg' },
  { name: 'Freshdesk', src: '/integrations/freshdesk.svg' },
];

const WORKSPACE_OUTPUTS = [
  'Own-store claim intelligence',
  'Evidence workflow',
  'Claim review queue',
];

function ProviderTile({ name, src, soon }: Provider) {
  return (
    <Lift>
      <div className={`ua-integ-tile${soon ? ' ua-integ-tile--soon' : ''}`}>
        <Image src={src} alt={`${name} logo`} width={22} height={22} className="ua-integ-tile-logo" />
        <span className="ua-integ-tile-name">{name}</span>
        {soon ? <span className="ua-integ-tile-soon">Soon</span> : null}
      </div>
    </Lift>
  );
}

export function LandingIntegrationsSection() {
  return (
    <>
      <section
        id="integrations"
        className="ua-landing-section-bg mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16"
      >
        <Reveal delay={40}>
          <p className="ua-landing-section-eyebrow">01 — Live sources</p>
          <h2 className="ua-landing-section-title">
            Connect live sources first.{' '}
            <span className="ua-landing-section-title-italic">Use CSV only for backfill.</span>
          </h2>
          <p className="ua-landing-section-body max-w-2xl">
            Unauth needs an order source and a helpdesk to monitor live claims. Orders provide purchase
            and fulfillment context; the helpdesk provides claim history and dispute context.
          </p>
        </Reveal>

        <Reveal delay={120} className="ua-integ-architecture">
          <div className="ua-integ-source-group">
            <div className="ua-integ-card">
              <p className="ua-integ-card-label">Order source</p>
              <div className="ua-integ-tile-grid">
                {ORDER_SOURCES.map((p) => (
                  <ProviderTile key={p.name} {...p} />
                ))}
              </div>
            </div>

            <span className="ua-integ-plus" aria-hidden="true">+</span>

            <div className="ua-integ-card">
              <p className="ua-integ-card-label">Helpdesk</p>
              <div className="ua-integ-tile-grid">
                {HELPDESKS.map((p) => (
                  <ProviderTile key={p.name} {...p} />
                ))}
              </div>
            </div>
          </div>

          <span className="ua-integ-arrow" aria-hidden="true">→</span>

          <div className="ua-integ-card ua-integ-card--output">
            <p className="ua-integ-card-label ua-integ-card-label--output">Unauth workspace</p>
            <ul className="ua-integ-output-list">
              {WORKSPACE_OUTPUTS.map((item) => (
                <li key={item}>
                  <span className="ua-integ-output-dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={200} className="ua-integ-csv-row">
          <span className="ua-integ-csv-tag">CSV fallback</span>
          <span className="ua-integ-csv-copy">
            Historical CSV backfill is available if you are not ready to connect live sources — optional,
            no live monitoring.
          </span>
        </Reveal>
      </section>

      <hr className="ua-landing-hr-faint" />
    </>
  );
}
