import { Check, CircleAlert, FileCheck2 } from 'lucide-react';
import { FL_LANDING_STORY } from '../../_lib/foundationContent';
import FoundationArtifactSlot, { ArtifactHeader } from './FoundationArtifactSlot';
import styles from './foundation.module.css';

export default function FoundationGateStory() {
  const story = FL_LANDING_STORY;
  const review = story.decision.review;

  return (
    <section
      id="evidence"
      className={`${styles.storySection} ${styles.storySectionPaper} ${styles.gateStorySection}`}
      aria-labelledby="evidence-heading"
    >
      <div className={styles.storySectionGrid}>
        <div className={styles.storySectionCopy}>
          <p className={styles.storyEyebrow}>{story.gate.eyebrow}</p>
          <h2 id="evidence-heading" className={styles.storyHeadline}>
            {story.gate.headline}
          </h2>
          <p className={styles.storyBody}>{story.gate.body}</p>
        </div>

        <FoundationArtifactSlot
          slot="gate-evidence-to-decision"
          label={`Evidence gate workbench for case ${FL_LANDING_STORY.caseId}`}
          className={`${styles.simpleArtifact} ${styles.gateArtifact}`}
        >
          <ArtifactHeader label={`Case ${story.caseId}`} meta="Fictional demo workspace" />

          <div className={styles.gateArtifactSummary}>
            <div>
              <span>Request</span>
              <strong>Refund requested · £128</strong>
            </div>
            <div>
              <span>Decision owner</span>
              <strong>Merchant team</strong>
            </div>
            <div>
              <span>External action</span>
              <strong>None</strong>
            </div>
          </div>

          <div className={styles.gateArtifactSection}>
            <div className={styles.gateArtifactSectionHeading}>
              <span>Evidence spine</span>
              <span>Source · timestamp</span>
            </div>
            <ol className={styles.evidenceSpine} aria-label="Source-labelled case records">
              {story.evidence.rows.map((row, index) => {
                const isGap = row.source === 'Still open';
                return (
                  <li
                    key={row.title}
                    className={`${styles.evidenceRow} ${isGap ? styles.evidenceRowGap : ''}`}
                  >
                    <span className={styles.evidenceNode} aria-hidden="true">
                      {isGap ? <CircleAlert size={13} /> : <Check size={13} />}
                    </span>
                    <div className={styles.evidenceRowContent}>
                      <div className={styles.evidenceRowTopline}>
                        <strong>{row.title}</strong>
                        <span className={styles.sourceTag}>{row.source}</span>
                        <span className={styles.artifactTime}>{row.timestamp}</span>
                      </div>
                      <span className={styles.evidenceRowDetail}>{row.detail}</span>
                    </div>
                    {index < story.evidence.rows.length - 1 ? (
                      <span className={styles.evidenceConnector} aria-hidden="true" />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <div id="decision" className={styles.gateRecommendation}>
            <div className={styles.gateRecommendationHeader}>
              <div>
                <span className={styles.gateRecommendationLabel}>Recommendation</span>
                <strong>Hold for evidence</strong>
              </div>
              <span className={styles.gateReviewStatus}>
                <CircleAlert size={14} aria-hidden="true" />
                Needs review
              </span>
            </div>
            <div className={styles.gateRuleRow}>
              <span>Matched rule</span>
              <strong>{review.rule}</strong>
            </div>
            <div className={styles.gateConditions}>
              <span>Why the case stopped</span>
              <ul>
                {review.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
            <div className={styles.gateRecommendationFooter}>
              <FileCheck2 size={16} aria-hidden="true" />
              <span>Merchant decision remains pending. The missing evidence is not guessed.</span>
            </div>
          </div>
        </FoundationArtifactSlot>
      </div>
    </section>
  );
}
