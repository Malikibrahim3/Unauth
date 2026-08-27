import Link from 'next/link';
import {
  ArrowUpRight,
  Briefcase,
  Link2,
  RefreshCcw,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { FL_LANDING_STORY, FL_ROUTES } from '../../_lib/foundationContent';
import FoundationArtifactSlot, { ArtifactHeader } from './FoundationArtifactSlot';
import styles from './foundation.module.css';

function FeatureIcon({ id }: { id: string }) {
  if (id === 'operate') return <Briefcase size={17} aria-hidden="true" />;
  if (id === 'control') return <ShieldCheck size={17} aria-hidden="true" />;
  if (id === 'recover') return <RefreshCcw size={17} aria-hidden="true" />;
  if (id === 'reconcile') return <Table2 size={17} aria-hidden="true" />;
  return <Link2 size={17} aria-hidden="true" />;
}

function FeaturePlaceholder({ id }: { id: string }) {
  if (id === 'operate') {
    return (
      <div className={styles.bentoQueuePlaceholder} aria-hidden="true">
        <div className={styles.bentoQueueRail}>
          <span className={styles.bentoActiveRail} />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.bentoQueueMain}>
          <div className={styles.bentoPlaceholderTopline}>
            <span>Open work</span>
            <b>12 cases</b>
          </div>
          <div className={styles.bentoQueueRows}>
            <div><span className={styles.bentoSignal} /><span>Refund · {FL_LANDING_STORY.caseId}</span><b>Review</b></div>
            <div><span className={styles.bentoSignal} /><span>Reship · CASE-DEMO-1039</span><b>Ready</b></div>
            <div><span className={styles.bentoSignalMuted} /><span>Claim · CASE-DEMO-1022</span><b>Open</b></div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'control') {
    return (
      <div className={styles.bentoRulePlaceholder} aria-hidden="true">
        <div className={styles.bentoRuleHeader}><span>Rule R-07</span><b>Merchant-owned</b></div>
        <div className={styles.bentoRuleLine}><span>IF</span><strong>Fulfilment evidence missing</strong><i>+</i></div>
        <div className={styles.bentoRuleLine}><span>THEN</span><strong>Hold for evidence</strong><i>✓</i></div>
        <div className={styles.bentoRunTrace}><span>Run inspected</span><b>Recommendation only</b></div>
      </div>
    );
  }

  if (id === 'recover') {
    return (
      <div className={styles.bentoCompactPlaceholder} aria-hidden="true">
        <div className={styles.bentoCompactTopline}><span>Recovery board</span><b>£128</b></div>
        <div className={styles.bentoOwnerRow}><span>Northline Parcel may own the loss</span><b>14 days</b></div>
        <div className={styles.bentoProgressLine}><span /><span /><span className={styles.bentoProgressCurrent} /><span /><span /></div>
        <small>Evidence package ready</small>
      </div>
    );
  }

  if (id === 'reconcile') {
    return (
      <div className={styles.bentoCompactPlaceholder} aria-hidden="true">
        <div className={styles.bentoLedgerHeader}><span>Source-to-ledger</span><b>Matched</b></div>
        <div className={styles.bentoLedgerRow}><span>Identified loss</span><strong>£2,548,859</strong></div>
        <div className={styles.bentoLedgerRow}><span>Open exception</span><strong className={styles.bentoLedgerWarning}>£910,251</strong></div>
        <small>One source value still needs action</small>
      </div>
    );
  }

  return (
    <div className={styles.bentoCompactPlaceholder} aria-hidden="true">
      <div className={styles.bentoSourceHeader}><span>Connected sources</span><b>5 ready</b></div>
      <div className={styles.bentoSourceRow}><span className={styles.bentoSourceDot} />Commerce <small>fresh</small></div>
      <div className={styles.bentoSourceRow}><span className={styles.bentoSourceDot} />Support <small>fresh</small></div>
      <div className={styles.bentoSourceRow}><span className={styles.bentoSourceDot} />Carrier <small>imported</small></div>
    </div>
  );
}

export default function FoundationFeatureBento() {
  const features = FL_LANDING_STORY.features;

  return (
    <section
      id="features"
      className={styles.featureBentoSection}
      aria-labelledby="features-heading"
    >
      <div className={styles.featureBentoPanel}>
        <div className={styles.featureBentoIntro}>
          <p className={styles.storyEyebrow}>{features.eyebrow}</p>
          <h2 id="features-heading" className={styles.featureBentoHeadline}>
            {features.headline}
          </h2>
          <p className={styles.featureBentoBody}>{features.body}</p>
          <Link href={FL_ROUTES.demo} prefetch={false} className={styles.featureBentoCta}>
            {features.cta}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.featureBentoGrid}>
          {features.cards.map((card) => (
            <article
              key={card.id}
              id={card.id === 'connect' ? 'integrations' : undefined}
              data-feature-family={card.id}
              className={`${styles.featureCard} ${card.layout === 'wide' ? styles.featureCardWide : styles.featureCardCompact}`}
            >
              <FoundationArtifactSlot
                slot={card.artifactSlot}
                label={`${card.title} product artefact`}
                className={styles.featureArtifact}
              >
                <ArtifactHeader label={card.title} meta="Simple product view" />
                <FeaturePlaceholder id={card.id} />
              </FoundationArtifactSlot>
              <div className={styles.featureCardCopy}>
                <div className={styles.featureCardTitleRow}>
                  <span className={styles.featureCardIcon}><FeatureIcon id={card.id} /></span>
                  <h3>{card.title}</h3>
                </div>
                <p>{card.body}</p>
                <ul className={styles.featureSurfaceList} aria-label={`${card.title} surfaces`}>
                  {card.surfaces.map((surface) => <li key={surface}>{surface}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.featureIndex}>
          <div className={styles.featureIndexHeading}>
            <span>Inside the workspace</span>
            <span>Core surfaces at a glance</span>
          </div>
          <div className={styles.featureIndexGrid}>
            {features.index.map((group) => (
              <div key={group.label} className={styles.featureIndexGroup}>
                <strong>{group.label}</strong>
                <span>{group.items.join(' · ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
