import styles from './foundation.module.css';

export default function FoundationHero2() {
  return (
    <section className={styles.hero2Field}>
      <div className={styles.hero2Layout}>
        <div className={styles.hero2Copy}>
          <h2 className={styles.hero2Headline}>
            <span className={styles.heroHeadlineLinePrimary}>
              You&apos;ve been absorbing
              <br />
              someone else&apos;s losses
            </span>
          </h2>
          <p className={`${styles.heroSubtitle} ${styles.hero2Subtitle}`}>
            Refund losses blur together. Unauth separates the cause, owner, evidence, and recovery
            route before each loss becomes a write-off.
          </p>
        </div>
      </div>
      <div className={styles.hero2ArtifactStage}>
        <div className={styles.hero2ArtifactCard}>
          <div className={styles.hero2ArtifactOuter}>
            <iframe
              src="/hero-artifact-stack.html"
              scrolling="no"
              className={styles.hero2ArtifactFrame}
              title="Account decision surface preview"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>
      <div className={styles.hero2Summary}>
        <div className={styles.hero2SummaryItem}>
          <h3 className={styles.hero2SummaryTitle}>Money kept</h3>
          <p className={styles.hero2SummaryBody}>
            Reflex refunds and repeat-claim reships get stopped before they leave your account.
          </p>
        </div>
        <div className={styles.hero2SummaryItem}>
          <h3 className={styles.hero2SummaryTitle}>Money recovered</h3>
          <p className={styles.hero2SummaryBody}>
            Carrier and 3PL losses are attributed with the evidence needed to go chase them.
          </p>
        </div>
        <div className={styles.hero2SummaryItem}>
          <h3 className={styles.hero2SummaryTitle}>Money defended</h3>
          <p className={styles.hero2SummaryBody}>
            Dispute records are assembled at decision time, not rebuilt under a deadline.
          </p>
        </div>
        <div className={styles.hero2SummaryItem}>
          <h3 className={styles.hero2SummaryTitle}>Money traced</h3>
          <p className={styles.hero2SummaryBody}>
            Every outcome gets an owner so leakage stops being invisible.
          </p>
        </div>
      </div>
    </section>
  );
}
