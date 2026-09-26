import { DEMO_CASES, DEMO_WORK_EXAMPLE, DEMO_DELIVERY_RECOVERY_PRESENTATION as DEMO_RECOVERY_PRESENTATION, demoRecoveryView, demoUrl } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import { MoneyReceiptScene, ReceiptMatchScene, SceneIcon } from './LandingScenes';
import { LandingArtifact } from './LandingArtifact';
import styles from './public.module.css';
const sample=DEMO_CASES.find(item=>item.id==='not-received')!;
/** Canonical fictional preparation. No submission or provider outcome is implied. */
export function RecoveryEvidenceVisual() {
 return <LandingArtifact id="recovery-evidence" title="A refund owed." subtitle="A recovery to pursue." className={styles.recoveryArtifact}
  details={<><p className={styles.artifactDetailLead}>Give an eligible claim a path towards collection.</p><dl className={styles.artifactFactList}><div><dt>Prepare</dt><dd>Keep the order, collection scan and carrier loss confirmation together with agreement {DEMO_RECOVERY_PRESENTATION.agreement}.</dd></div><div><dt>Review and submit</dt><dd>Confirm the eligible claimant, account and submission channel. Your team submits the reviewed pack and records its reference.</dd></div><div><dt>Follow through</dt><dd>Track the response and any payment. Compare a rejection or short payment with the evidence and terms before preparing a supported challenge.</dd></div></dl><p>The {formatMoney(sample.ceiling!, 'GBP')} ceiling is not money received. Keep unsupported or expired routes explicit and preserve the remaining recorded loss.</p><a className={styles.artifactTextLink} href={demoUrl(sample.id)}>Explore this recovery <SceneIcon name="arrow"/></a></>}>
 <figure className={styles.recoveryChapterMedia} data-story-artifact="recovery-pack" aria-label="Recovery preparation for the missing order">
  <div className={styles.recoveryCustomerLane}><SceneIcon name="user"/><strong>Unauth outcome: refund {formatMoney(sample.amount, 'GBP')}</strong><span>Selected by your policy</span></div>
  <div className={styles.claimFolder}><div className={styles.folderTab}><SceneIcon name="file"/>{sample.reference} · Recovery pack</div>
   <div className={styles.claimPackHead}><span>Carrier claim · not submitted</span><h3>Up to {formatMoney(sample.ceiling!,'GBP')} eligible</h3><p className={styles.claimExtract}>{DEMO_RECOVERY_PRESENTATION.agreement} · eligible agreement limit.</p></div>
   <div className={styles.claimPackContent}><div className={styles.packDocuments}><h3>Supporting evidence</h3>{DEMO_RECOVERY_PRESENTATION.supportingRecords.map(label=><div key={label}><SceneIcon name="file"/><span>{label}</span><SceneIcon name="check"/></div>)}</div><div className={styles.submissionHandoff}><div className={styles.handoffHeading}><SceneIcon name="arrow"/><h3>Confirm who can claim and where to submit.</h3></div><dl><div><dt>Owner</dt><dd className={styles.handoffOwner}><span aria-hidden="true">{DEMO_WORK_EXAMPLE.initials}</span>{DEMO_WORK_EXAMPLE.owner}</dd></div><div><dt>Submission</dt><dd>Manual, after review</dd></div></dl></div></div>
  </div>
  <div className={styles.recoveryTrail} aria-label="Designed recovery follow-through"><strong>Evidence</strong><SceneIcon name="arrow"/><span>Claim</span><SceneIcon name="arrow"/><span>Follow-up</span><SceneIcon name="arrow"/><span>Payment</span></div>
 </figure>
 </LandingArtifact>;
}
export function FinancialOutcomeVisual() {
 const { amounts } = demoRecoveryView('reconciled', sample.id);
 return <LandingArtifact id="verified-money" title="Approval on record." subtitle="Payment still needs proof." className={styles.financeArtifact}
  details={<><p className={styles.artifactDetailLead}>An approval and a payment are different events.</p><dl className={styles.artifactFactList}><div><dt>Approved</dt><dd>The provider has accepted an amount. Payment still needs evidence.</dd></div><div><dt>Received</dt><dd>A payment or applied-credit record exists. It still needs to be matched to the recovery.</dd></div><div><dt>Matched and reconciled</dt><dd>The receipt has been checked against the case and its financial records.</dd></div></dl><p>After verification, {formatMoney(amounts.refunded, 'GBP')} refunded less {formatMoney(amounts.reconciled, 'GBP')} received, matched and reconciled leaves {formatMoney(amounts.balance, 'GBP')} of the refund unrecovered. That balance is not total loss or profit.</p></>}>
  <figure className={styles.moneyChapterMedia} data-story-artifact="financial-outcome" aria-label="Payment verification for the missing order"><div className={styles.moneyCurrentState}><span>Follow the money</span><strong>If the £248 refund is paid and the £150 claim proceeds.</strong></div><section className={styles.moneyLaterState} aria-label="Receipt review"><ReceiptMatchScene/></section><section className={styles.moneyLaterState} aria-label="Outcome after verification"><MoneyReceiptScene/></section></figure>
 </LandingArtifact>;
}

const operatingPaths = [
  { heading: 'One case. Clear responsibilities.', steps: [['Support', 'Resolve the customer request'], ['Recovery', 'Prepare the claim and follow up'], ['Finance', 'Check the payment and remaining cost']], note: 'An illustrative team handoff. Each task keeps its own owner, next action and due or review date.' },
  { heading: 'Change the rule with your eyes open.', steps: [['Propose', 'Write the rule you want to change'], ['Preview', 'Inspect affected cases and amounts'], ['Publish', 'An authorised person confirms the change']], note: 'An illustrative rule review. A preview changes no live rules and does not prove savings.' },
  { heading: 'Turn a repeated problem into a question.', steps: [['Find a pattern', 'Review products, warehouses or carriers'], ['Open the cases', 'Check the facts behind the pattern'], ['Investigate', 'Decide whether a rule needs changing']], note: 'An illustrative investigation path. A pattern alone does not prove fault or change policy.' },
];

export function OperatingPathVisual({ selected }: { selected: number }) {
  const path = operatingPaths[selected];
  return <figure className={styles.operatingPath} data-story-artifact="operating-path">
    <figcaption>How the work connects</figcaption>
    <h4>{path.heading}</h4>
    <ol>{path.steps.map(([label, text]) => <li key={label}><span className={styles.pathNode} aria-hidden="true"/><div><strong>{label}</strong><p>{text}</p></div></li>)}</ol>
    <p className={styles.artifactNote}>{path.note}</p>
  </figure>;
}
