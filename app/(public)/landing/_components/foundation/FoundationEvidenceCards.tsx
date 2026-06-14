'use client';

import { ClipboardList, Clock, CreditCard, Workflow } from 'lucide-react';
import FloatingEvidenceCard from './FloatingEvidenceCard';
import { HeroDrift } from './ParallaxLayer';
import { FL_HERO_FLOATING_CARDS } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationEvidenceCards() {
  const cards = FL_HERO_FLOATING_CARDS;

  return (
    <HeroDrift
      factor={-0.28}
      fade
      scrollMax={1000}
      fadeEnd={850}
      className={styles.evidenceCardsLayer}
    >
      <FloatingEvidenceCard
        className={styles.evidenceCardOrderHistory}
        label={cards.orderHistory.label}
        title={cards.orderHistory.title}
        details={[...cards.orderHistory.details]}
        icon={<ClipboardList size={17} aria-hidden />}
        tone="neutral"
        delay={0}
        showSignalDot
      />

      <FloatingEvidenceCard
        className={styles.evidenceCardClaimTiming}
        label={cards.claimTiming.label}
        title={cards.claimTiming.title}
        details={[...cards.claimTiming.details]}
        icon={<Clock size={17} aria-hidden />}
        tone="amber"
        delay={0.08}
      />

      <FloatingEvidenceCard
        className={styles.evidenceCardCrossMerchant}
        label={cards.crossMerchant.label}
        title={cards.crossMerchant.title}
        details={[...cards.crossMerchant.details]}
        icon={<Workflow size={17} aria-hidden />}
        tone="rust"
        delay={0.16}
        showSignalDot
      />

      <FloatingEvidenceCard
        className={styles.evidenceCardPriorClaims}
        label={cards.priorClaims.label}
        title={cards.priorClaims.title}
        details={[...cards.priorClaims.details]}
        icon={<CreditCard size={17} aria-hidden />}
        tone="amber"
        delay={0.24}
      />

      <span className={styles.evidenceConnector} aria-hidden />
    </HeroDrift>
  );
}
