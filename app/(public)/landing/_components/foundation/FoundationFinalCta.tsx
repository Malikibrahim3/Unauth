import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { FL_LANDING_STORY, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

export default function FoundationFinalCta() {
  const closing = FL_LANDING_STORY.closing;

  return (
    <section
      id="close-loop"
      data-nav-theme="light"
      aria-labelledby="closing-heading"
      className={`${styles.finalField} ${styles.closingSection}`}
    >
      <div className={styles.closingInner}>
        <div className={styles.closingCopy}>
          <p className={styles.storyEyebrow}>Next step</p>
          <h2 id="closing-heading" className={styles.closingHeadline}>
            {closing.headline}
          </h2>
          <p className={styles.closingBody}>{closing.body}</p>
          <div className={styles.closingCtas}>
            <Link href={FL_ROUTES.demo} prefetch={false} className={styles.closingPrimary}>
              Book a walkthrough
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <a href={FL_ROUTES.gate} className={styles.closingSecondary}>
              Explore the gate
            </a>
          </div>
        </div>

        <div
          data-artifact-slot="closing-walkthrough"
          className={`${styles.simpleArtifact} ${styles.closingArtifact}`}
        >
          <div className={styles.artifactHeader}>
            <span>Walkthrough path</span>
            <span>Fictional demo workspace</span>
          </div>
          <ol className={styles.closingSequence}>
            {closing.steps.map((step, index) => (
              <li key={step.label}>
                <span className={styles.closingIndex}>0{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
                <Check size={16} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
