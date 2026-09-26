import { DEMO_CASES, DEMO_LANDING_WORK } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import { SceneIcon } from './LandingScenes';
import styles from './public.module.css';
const sample = DEMO_CASES.find(item => item.id === 'recoverable')!;
export function LandingProductGrid() {
  return <section id="work" className={`${styles.container} ${styles.chapter}`} aria-labelledby="platform-title">
    <div className={styles.productIntro}><h2 id="platform-title" className={styles.heading}>Everyone knows<br/><span>the next step.</span></h2><p>One current work record keeps ownership clear.</p></div>
    <figure className={styles.sharedCaseScene} data-story-artifact="shared-case">
      <div className={styles.sharedCaseHeader}><SceneIcon name="file"/><strong>{sample.reference}</strong><span>Current work · fictional example</span></div>
      <div className={styles.sharedCasePanels}>
        <section><div className={styles.sharedCaseRole}><SceneIcon name="chat"/><span>Support</span></div><h3>Review the {formatMoney(sample.amount,'GBP')} refund request.</h3><p>Decision pending.</p><a href="#examples">Review the remedy <SceneIcon name="arrow"/></a></section>
        <section><div className={styles.sharedCaseRole}><SceneIcon name="file"/><span>Recovery</span></div><h3>{DEMO_LANDING_WORK[0].owner}: confirm who can submit the claim.</h3><p>Warehouse claim not submitted.</p><a href="#recovery">Open the recovery task <SceneIcon name="arrow"/></a></section>
        <section><div className={styles.sharedCaseRole}><SceneIcon name="money"/><span>Finance</span></div><h3>No receipt recorded for this case.</h3><p>Nothing to match or reconcile yet.</p><a href="#money">See a later example <SceneIcon name="arrow"/></a></section>
      </div>
      <figcaption>Fictional current state · customer help does not wait for recovery.</figcaption>
    </figure>
  </section>;
}
