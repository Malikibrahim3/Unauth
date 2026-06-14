import Reveal from '../Reveal';
import ParallaxLayer from './ParallaxLayer';
import { FL_PRICING } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationPricingHero() {
  return (
    <section data-nav-theme="light" className={styles.pricingHero}>
      <div className="relative z-10 mx-auto w-full max-w-[100rem] px-5 pb-10 pt-28 sm:px-10 lg:pb-14 lg:pt-36">
        <ParallaxLayer speed={0.22}>
          <Reveal>
            <div className="max-w-[720px]">
              <p className={styles.landingSectionEyebrow}>{FL_PRICING.eyebrow}</p>
              <h1 className={styles.landingSectionTitle}>{FL_PRICING.headline}</h1>
              <p className={`${styles.landingSectionLead} max-w-[640px]`}>{FL_PRICING.lead}</p>
            </div>
          </Reveal>
        </ParallaxLayer>
      </div>
    </section>
  );
}
