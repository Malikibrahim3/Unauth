'use client';

import { GateArtifactsRow } from '@/components/EvidenceNotVerdictsRampSection';
import Reveal from './Reveal';
import foundationStyles from './foundation/foundation.module.css';

export function ClaimGateHero() {
  return (
    <section
      className="border-b border-[var(--border-subtle)] bg-white pb-[140px]"
      data-nav-theme="light"
    >
      <div className={foundationStyles.hero2Layout}>
        <div className={foundationStyles.hero2Copy}>
          <Reveal>
            <h2
              className={foundationStyles.hero2Headline}
              style={{ maxWidth: 760 }}
            >
              Evidence sits beside the decision
              <br />
              before the payout is recorded.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p
              className={`${foundationStyles.heroSubtitle} ${foundationStyles.hero2Subtitle}`}
            >
              Unauth applies your rules to every payout case and makes the
              recommendation explainable. Your team keeps control of the outcome.
            </p>
          </Reveal>
        </div>

        <Reveal delay={180}>
          <GateArtifactsRow scale={0.9} align="content" />
        </Reveal>
      </div>
    </section>
  );
}
