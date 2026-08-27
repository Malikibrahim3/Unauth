import { Check, Clock3, FileCheck2 } from 'lucide-react';
import { FL_LANDING_STORY } from '../../_lib/foundationContent';
import FoundationArtifactSlot, { ArtifactHeader } from './FoundationArtifactSlot';
import styles from './foundation.module.css';

export default function FoundationRecoveryStory() {
  const story = FL_LANDING_STORY;

  return (
    <section
      id="recovery"
      className={`${styles.storySection} ${styles.storySectionPaper}`}
      aria-labelledby="recovery-heading"
    >
      <div className={styles.storySectionGrid}>
        <div className={styles.storySectionCopy}>
          <p className={styles.storyEyebrow}>{story.recovery.eyebrow}</p>
          <h2 id="recovery-heading" className={styles.storyHeadline}>
            {story.recovery.headline}
          </h2>
          <p className={styles.storyBody}>{story.recovery.body}</p>
        </div>

        <FoundationArtifactSlot
          slot="recovery-follow-through"
          label={`Recovery follow-through for case ${FL_LANDING_STORY.caseId}`}
          className={`${styles.simpleArtifact} ${styles.recoveryArtifact}`}
        >
          <ArtifactHeader label="Recovery board" meta={`Case ${story.caseId}`} />

          <div className={styles.recoveryTransition}>
            <Check size={15} aria-hidden="true" />
            <span>{story.recovery.transition}</span>
          </div>

          <div className={styles.recoverySummary}>
            <div>
              <span>Customer outcome</span>
              <strong>Pending</strong>
            </div>
            <div>
              <span>Responsibility</span>
              <strong>{story.recovery.responsibility}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{story.recovery.amount}</strong>
            </div>
          </div>

          <div className={styles.recoveryEvidenceBlock}>
            <div className={styles.recoveryBlockHeading}>
              <span>Evidence on file</span>
              <FileCheck2 size={16} aria-hidden="true" />
            </div>
            <ul className={styles.recoveryEvidenceList}>
              {story.recovery.evidence.map((item) => (
                <li key={item}>
                  <Check size={13} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.recoveryDeadline}>
            <Clock3 size={18} aria-hidden="true" />
            <div>
              <span>Claim window</span>
              <strong>{story.recovery.deadline}</strong>
            </div>
            <b>{story.recovery.amount}</b>
          </div>

          <ol className={styles.recoveryStages} aria-label="Recovery outcome stages">
            {story.recovery.stages.map((stage, index) => (
              <li
                key={stage}
                className={index === story.recovery.stages.length - 1 ? styles.recoveryStageCurrent : ''}
              >
                <span className={styles.recoveryStageDot}>
                  {index < 1 ? <Check size={12} aria-hidden="true" /> : null}
                </span>
                <span>{stage}</span>
              </li>
            ))}
          </ol>
        </FoundationArtifactSlot>
      </div>
    </section>
  );
}
