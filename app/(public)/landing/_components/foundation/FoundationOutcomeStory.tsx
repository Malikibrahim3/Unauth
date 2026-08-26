import Link from 'next/link';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { FL_LANDING_STORY, FL_ROUTES } from '../../_lib/foundationContent';
import FoundationArtifactSlot, { ArtifactHeader } from './FoundationArtifactSlot';
import styles from './foundation.module.css';

export default function FoundationOutcomeStory() {
  const story = FL_LANDING_STORY;

  return (
    <section
      id="outcome"
      className={`${styles.storySection} ${styles.storySectionTint} ${styles.storySectionReverse}`}
      aria-labelledby="outcome-heading"
    >
      <div className={styles.storySectionGrid}>
        <div className={styles.storySectionCopy}>
          <p className={styles.storyEyebrow}>{story.outcome.eyebrow}</p>
          <h2 id="outcome-heading" className={styles.storyHeadline}>
            {story.outcome.headline}
          </h2>
          <p className={styles.storyBody}>{story.outcome.body}</p>
        </div>

        <FoundationArtifactSlot
          slot="financial-case-to-ledger"
          label={`Case-to-ledger financial outcome for case ${FL_LANDING_STORY.caseId}`}
          className={`${styles.simpleArtifact} ${styles.outcomeArtifact}`}
        >
          <ArtifactHeader label="Financial outcome" meta="Case-linked view" />

          <div className={styles.outcomeFlow} aria-label="Case-to-ledger trace">
            {story.outcome.trace.map((step, index) => (
              <div key={step.label} className={styles.outcomeFlowItem}>
                <span>{step.label}</span>
                <strong>{step.value}</strong>
                {index < story.outcome.trace.length - 1 ? (
                  <ArrowRight size={15} aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>

          <div className={styles.outcomeDashboardMetrics} aria-label="Overview financial outcome values">
            {story.outcome.metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className={styles.outcomeDrillThrough}>
            <div className={styles.outcomeDrillCopy}>
              <span>Drill-through · {story.caseId}</span>
              <strong>{story.outcome.drillThrough.title}</strong>
              <small>{story.outcome.drillThrough.detail}</small>
            </div>
            <Link href={FL_ROUTES.gate} prefetch={false} className={styles.outcomeDrillLink}>
              Trace the case
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.outcomeFooter}>
            <CircleAlert size={15} aria-hidden="true" />
            <span>£128 remains open until the evidence is complete and the merchant decides.</span>
          </div>
        </FoundationArtifactSlot>
      </div>
    </section>
  );
}
