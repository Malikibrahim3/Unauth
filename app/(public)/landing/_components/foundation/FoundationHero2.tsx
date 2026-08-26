import FoundationFeatureBento from './FoundationFeatureBento';
import FoundationGateStory from './FoundationGateStory';
import FoundationOutcomeStory from './FoundationOutcomeStory';
import FoundationRecoveryStory from './FoundationRecoveryStory';
import styles from './foundation.module.css';

export default function FoundationHero2() {
  return (
    <div className={styles.storyField}>
      <FoundationGateStory />
      <FoundationFeatureBento />
      <FoundationRecoveryStory />
      <FoundationOutcomeStory />
    </div>
  );
}
