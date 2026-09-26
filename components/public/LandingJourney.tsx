import styles from './public.module.css';
import { LANDING_STAGES } from './landingStory';
/** Static linked orientation. No simulated activity or dependency on motion. */
export function LandingJourney() {
  return <section id="workflow" className={styles.workflow} aria-labelledby="journey-title"><div className={styles.container}>
    <div className={styles.workflowIntro}><h2 id="journey-title">Use the evidence once.</h2><p>Help the customer while recovery continues separately.</p></div>
    <ol className={styles.workflowStages} aria-label="Three jobs in the Unauth workflow">{LANDING_STAGES.map((step,i)=><li key={step.id}><a href={`#${step.id}`}><span className={styles.workflowNumber} aria-hidden="true">0{i+1}</span><h3>{step.title}</h3><span className={styles.workflowArrow} aria-hidden="true">→</span></a></li>)}</ol>
  </div></section>;
}
