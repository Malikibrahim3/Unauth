import type { ReactNode } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DEMO_CASES, DEMO_DELIVERY_RECOVERY_PRESENTATION, DEMO_PRESENTATION, DEMO_GATE_PRESENTATION, DEMO_LANDING_POLICY_OUTCOMES, DEMO_RECOVERY_PRESENTATION, DEMO_LANDING_WORK, DEMO_NOT_RECEIVED_REVIEW_THRESHOLD, DEMO_RECEIPT_REVIEW, demoRecoveryView, type DemoCase } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import styles from './public.module.css';

export const landingCase = DEMO_CASES.find(item => item.id === 'recoverable')!;
const money = (value: number) => formatMoney(value, 'GBP');
export const landingRecoveryWording = `${landingCase.reference} concerns a ${money(landingCase.amount)} refund request for the wrong item. ${DEMO_RECOVERY_PRESENTATION.evidence} Agreement ${DEMO_RECOVERY_PRESENTATION.agreement} caps eligible recovery at ${money(landingCase.ceiling!)}.`;
const paths = {
  check: 'm5 12 4 4L19 6', file: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h5',
  box: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l10 4',
  chat: 'M4 4h16v12H8l-4 4V4Zm4 5h8m-8 3h5', money: 'M3 5h18v14H3V5Zm5 7h.01M16 12h.01M14 12a2 3 0 1 1-4 0 2 3 0 1 1 4 0',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 21v-3a7 7 0 0 1 14 0v3',
  arrow: 'M5 12h14m-5-5 5 5-5 5', outward: 'M6 18 18 6M6 6h12v12', flow: 'M5 3v12a4 4 0 0 0 4 4h10m-4-4 4 4-4 4M5 6h14M16 3l3 3-3 3',
};
export function SceneIcon({name, className = ''}: {name:keyof typeof paths;className?:string}) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
export function SceneWindow({title,children,className=''}:{title:string;children:ReactNode;className?:string}) {
  return <div className={`${styles.sceneWindow} ${className}`}><div className={styles.sceneBar}><UnauthLogo kind="symbol" tone="graphite" height={16} decorative/><span>{title}</span><span aria-hidden="true">···</span></div>{children}</div>;
}
/** A landing illustration with live text, using the same sample as the adjacent recovery pack. */
export function CustomerDecisionScene() {
  const detail = DEMO_PRESENTATION[landingCase.id];
  return <div className={styles.customerDecisionScene} data-story-artifact="customer-decision">
    <div className={styles.customerDecisionPaper}>
      <div className={styles.paperHeader}><SceneIcon name="chat"/><span>Customer request</span><span>{landingCase.reference}</span></div>
      <div className={styles.customerDecisionRequest}>
        <h4>{detail.issue}</h4><strong>{money(landingCase.amount)}</strong>
      </div>
      <dl className={styles.customerDecisionFacts}>
        <div><dt><SceneIcon name="box"/>Packing evidence</dt><dd>{detail.record}</dd></div>
        <div><dt><SceneIcon name="money"/>Earlier refund</dt><dd>{money(landingCase.priorRefund)}</dd></div>
      </dl>
      <div className={styles.customerDecisionRoute}>
        <UnauthLogo kind="symbol" tone="graphite" height={24} decorative/>
        <div><span>Recommendation for review</span><strong>{detail.route}</strong></div>
      </div>
    </div>
  </div>;
}
const primaryCase = DEMO_CASES.find(item => item.id === 'not-received')!;
export function CaseDecisionScene({sample=primaryCase}:{sample?:DemoCase}) {
  const detail=DEMO_PRESENTATION[sample.id];
  const gate=DEMO_GATE_PRESENTATION[sample.id];
  const outcome=DEMO_LANDING_POLICY_OUTCOMES[sample.id];
  const decision=outcome.action==='refund'?`Refund ${money(sample.amount)}`:outcome.action==='replace'?'Send the same-item replacement':'No additional payout';
  return <div className={styles.decisionScene} data-story-artifact="case-decision">
    <SceneWindow title={`Policy outcome / ${sample.reference}`}>
      <div className={styles.sceneBody}>
        <div className={styles.sceneRequestLabel}><SceneIcon name="chat"/><span className={styles.recordKicker}>Customer request</span></div><div className={styles.sceneHeading}><h4>{detail.issue}</h4><b>{money(sample.amount)}</b></div>
        <div className={styles.decisionRecords}>
          <div><span>Order record</span><strong>{sample.priorRefund>0?`${money(sample.priorRefund)} earlier refund confirmed`:'No earlier refund recorded'}</strong></div>
          <div><span>{sample.id==='recoverable'?'Warehouse record':gate.evidenceLabel}</span><strong>{detail.record}</strong></div>
          {sample.id==='recoverable'&&<div className={styles.subordinateRecord}><span>Carrier record</span><strong>Not supplied</strong></div>}
        </div>
        <div className={styles.sceneRule}><span>Your automatic policy</span><strong>{outcome.rule}</strong></div>
        {sample.priorRefund>0 && <div className={styles.priorRefund}><span>Paying this request again would mean</span><strong>{money(sample.priorRefund+sample.amount)} total refunds</strong><small>On the same {money(sample.amount)} item · conditional risk</small></div>}
        <div className={styles.recommendation}><span className={styles.recommendationMark}><UnauthLogo kind="symbol" tone="graphite" height={24} decorative/></span><div className={styles.recommendationCopy}><span>Unauth decision</span><strong>{decision}</strong><small>{outcome.reason}</small></div></div>
        {!!sample.ceiling&&<div className={styles.decisionOutputs}>
          <section><span>Separate recovery outcome</span><strong>Prepare up to {money(sample.ceiling!)} from the {sample.id==='not-received'?'carrier':'warehouse'}</strong><small>Submission held until claimant and channel are confirmed</small></section>
          <section><span>If both amounts are paid in full</span><strong>{money(sample.amount-sample.ceiling!)} of the refund remains unrecovered</strong><small>Recovery cannot cover the full refund</small></section>
        </div>}
        {sample.id==='legitimate'&&<div className={styles.sceneChoicePair}><span><b>Selected replacement cost</b>{money((sample.replacementGoods??0)+(sample.replacementShipping??0))}<small>{money(sample.replacementGoods??0)} goods + {money(sample.replacementShipping??0)} shipping</small></span><span><b>Original item value</b>{money(sample.amount)}<small>Not the replacement cost</small></span></div>}
      </div>
    </SceneWindow>
  </div>;
}
export function RecoveryPackScene() {
  return <div className={styles.packScene} data-story-artifact="recovery-pack">
    <div className={styles.packBack} aria-hidden="true"/>
    <div className={styles.packPaper}><div className={styles.paperHeader}><SceneIcon name="file"/><span>Recovery preparation</span><span>{landingCase.reference}</span></div>
      <div className={styles.packAmount}><span>Eligible agreement ceiling</span><strong>{money(landingCase.ceiling!)}</strong><small>{DEMO_RECOVERY_PRESENTATION.agreement} · not money received</small></div>
      <p className={styles.packExtract}>{DEMO_RECOVERY_PRESENTATION.evidence}</p>
      <div className={styles.packManual}><span>Next action</span><strong>Review the pack. Submit in your tool.</strong></div>
    </div>
  </div>;
}
export function MoneyReceiptScene() {
  const {amounts}=demoRecoveryView('reconciled', primaryCase.id);
  return <div className={styles.receiptScene} data-story-artifact="reconciled-outcome"><div className={styles.receiptPaper}>
    <div className={styles.receiptTop}><SceneIcon name="money"/><span>3. Verified outcome</span></div>
    <div className={styles.receiptColumns}>
      <div className={styles.receiptSummary}><h4>Recovery received, matched and reconciled.</h4><strong className={styles.reconciledAmount}>{money(amounts.reconciled)}</strong></div>
      <div className={styles.receiptSettlement}><dl className={styles.receiptRows}><div><dt>Refund paid</dt><dd>{money(amounts.refunded)}</dd></div><div><dt>Recovery received, matched and reconciled</dt><dd>− {money(amounts.reconciled)}</dd></div><div className={styles.receiptBalance}><dt>Refund balance still unrecovered</dt><dd>{money(amounts.balance)}</dd></div></dl><div className={styles.receiptFoot}>Not total loss or profit.</div></div>
    </div>
  </div></div>;
}
export function RecoveryBoardScene() {
  const task=DEMO_LANDING_WORK[0];
  return <div className={styles.recoveryBoardScene} data-story-artifact="recovery-board"><SceneWindow title="Recovery board">
    <div className={styles.recoveryBoardBody}>
      <div className={styles.boardStage}><span className={styles.smallDot}/><strong>{task.status}</strong><span>1 recovery shown</span></div>
      <div className={styles.boardRecovery}><div><span>{landingCase.reference}</span><h4>{DEMO_PRESENTATION.recoverable.issue}</h4></div><strong>{money(landingCase.ceiling!)}<small>Eligible ceiling</small></strong></div>
      <div className={styles.boardEvidence}><SceneIcon name="file"/><span>Order, packing evidence and acknowledgement retained</span></div>
      <dl className={styles.boardNext}><div><dt>Next action</dt><dd>{task.title}</dd></div><div><dt>Owner</dt><dd>{task.owner}</dd></div><div><dt>Review date</dt><dd>{task.reviewDate}<small>Merchant-set</small></dd></div></dl>
      <p className={styles.boardFoot}>Claim not submitted</p>
    </div>
  </SceneWindow></div>;
}
export function ReceiptMatchScene() {
  const {amounts}=demoRecoveryView('received', primaryCase.id);
  return <div className={styles.receiptMatchScene} data-story-artifact="receipt-matching"><SceneWindow title="Payment records">
    <div className={styles.receiptMatchBody}>
      <div className={styles.matchRecord}><span>1. Approved</span><strong>{money(amounts.received)}</strong><small>Payment not yet verified</small></div>
      <div className={styles.matchConnector}><SceneIcon name="arrow"/><span>Check against the recovery</span></div>
      <div className={styles.matchRecord}><span>2. Receipt to check</span><strong>{money(amounts.received)}</strong><small>{DEMO_DELIVERY_RECOVERY_PRESENTATION.receiptReference} · {DEMO_RECEIPT_REVIEW.state}</small></div>
    </div>
  </SceneWindow></div>;
}
export function WorkQueueScene({ detail=false }: {detail?:boolean}) {
  return <div className={styles.workQueueScene} data-story-artifact="work-queue"><SceneWindow title="Work / Open tasks">
    <div className={styles.workQueueRows}>{DEMO_LANDING_WORK.map(task=>{
      const sample=DEMO_CASES.find(item=>item.id===task.caseId)!;
      return <div className={styles.workQueueRow} key={task.id}><div className={styles.workQueueRef}><span>{sample.reference}</span><span>{task.status}</span></div><h4>{task.title}</h4><div className={styles.workQueueOwner}><span>{task.initials}</span><strong>{task.owner}</strong></div><p className={styles.workQueueEvidence}>{task.context}</p><p className={styles.workReviewDate}>Review {task.reviewDate} · merchant-set</p></div>;
    })}</div>
    {detail&&<div className={styles.workQueueContext}><SceneIcon name="arrow"/><div><strong>Open the linked case</strong><p>Review its evidence, recommendation and recovery work in the same context.</p></div></div>}
  </SceneWindow></div>;
}
export function RuleScene() {
  return <div className={styles.ruleScene} data-story-artifact="rule-preview"><SceneWindow title="Reports and rules"><div className={styles.ruleBody}><span className={styles.recordKicker}>Supporting case</span><h4>{DEMO_CASES[1].reference}</h4><div className={styles.ruleSample}><span>Earlier refund</span><strong>{money(DEMO_CASES[1].priorRefund)}</strong></div><div className={styles.ruleCondition}><span>When</span><strong>Same item</strong></div><div className={styles.ruleCondition}><span>And</span><strong>Prior refund recorded</strong></div><div className={styles.ruleRoute}><SceneIcon name="flow"/><div><span>Proposed check</span><strong>Review before another payout</strong></div></div><p>Preview the effect before publishing.</p></div></SceneWindow></div>;
}

/** Intended control diagram, with a separate unchanged pending sample state. */
export function EvidenceAssembly() {
  const routes = [
    ['check', 'Authorised action'],
    ['user', 'Approval required'],
    ['file', 'More evidence needed'],
    ['money', 'Earlier refund found'],
  ] as const;
  return <figure className={styles.gateControlScene} data-story-artifact="evidence-assembly" aria-label="Evidence and policy review with a pending fictional case">
    <div className={styles.gateSourceRecords}>
      <div><div className={styles.gateRecordHeader}><SceneIcon name="box"/><span>Store</span></div><strong>{DEMO_PRESENTATION.recoverable.item}</strong><small>{money(landingCase.amount)} requested · no earlier refund</small></div>
      <div><div className={styles.gateRecordHeader}><SceneIcon name="chat"/><span>Helpdesk</span></div><strong>Wrong item received</strong><small>Customer’s reported issue</small></div>
      <div><div className={styles.gateRecordHeader}><SceneIcon name="file"/><span>3PL · Warehouse records</span></div><strong>Packing error acknowledged</strong><small>What was packed and dispatched</small></div>
      <div className={styles.gateRecordMissing}><div className={styles.gateRecordHeader}><SceneIcon name="flow"/><span>Carrier · Delivery records</span></div><strong>No carrier record supplied</strong><small>Tracking · delivery status · available proof</small></div>
    </div>
    <div className={styles.gateConvergence} aria-hidden="true"><span/><span/><span/><span/></div>
    <div className={styles.gateBoundary}>
      <div className={styles.gateActors}><span><SceneIcon name="user"/>People: recommendation + reasons</span><small>Authorised exceptions keep a named person and reason.</small><span><SceneIcon name="flow"/>Connected AI: authorised route</span><small>Escalates review; cannot approve its own exception.</small></div>
      <div className={styles.gateAuthority}><UnauthLogo kind="symbol" tone="graphite" height={38} decorative/><div><h3>Unauth gate</h3><p>Evidence + your policy</p></div></div>
      <div className={styles.gateBoundaryNote}><strong>Check before<br/>{' '}another action.</strong><span>Earlier refunds and reserved actions matter. External action stays in your tools today.</span></div>
    </div>
    <div className={styles.gateRouteIntro}><span>Possible routes</span><p>An agent cannot approve its own exception.</p></div>
    <ul className={styles.gateRoutes}>{routes.map(([icon,name])=><li key={name}><SceneIcon name={icon}/><h4>{name}</h4></li>)}</ul>
    <div id="evidence" className={styles.gatePendingSample}><div><span>{landingCase.reference} · decision pending</span><strong>{DEMO_GATE_PRESENTATION.recoverable.conciseRule}</strong><p>Recommendation: {DEMO_PRESENTATION.recoverable.route}. Approval required.</p></div><div><span>Separate recovery</span><strong>{money(landingCase.ceiling!)} maximum eligible claim</strong><p>{DEMO_RECOVERY_PRESENTATION.agreement} · not submitted or received</p></div></div>
    <figcaption className={styles.mediaCaption}>Fictional case · warehouse evidence supplied; no carrier record supplied.</figcaption>
  </figure>;
}
export function PolicyReviewScene() {
  return <div className={styles.policyReviewScene}>
    <div className={styles.policyDiagramTitle}><SceneIcon name="flow"/><strong>Cases → Rules → Preview</strong></div>
    <h4>The next claim gets a decision.</h4><p className={styles.policyScope}>{DEMO_LANDING_POLICY_OUTCOMES[primaryCase.id].rule}</p>
    <table className={styles.policyPreviewTable}><caption className={styles.visuallyHidden}>Missing-order rule checked against {primaryCase.reference}</caption><thead><tr><th scope="col">Check {primaryCase.reference}</th><th scope="col">Evidence</th></tr></thead><tbody>
      <tr><th scope="row">Reported issue</th><td>{DEMO_PRESENTATION[primaryCase.id].issue}</td></tr>
      <tr><th scope="row">Carrier investigation</th><td>{DEMO_PRESENTATION[primaryCase.id].record}</td></tr>
      <tr><th scope="row">Earlier refund</th><td>{money(primaryCase.priorRefund)}</td></tr>
      <tr><th scope="row">Claim / review limit</th><td>{money(primaryCase.amount)} / {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)}</td></tr>
      <tr data-matched="true"><th scope="row">Previewed route</th><td>Refund {money(primaryCase.amount)}</td></tr>
    </tbody></table>
    <p className={styles.policyPreviewFooter}>You approve the rule. Unauth applies it to matching claims.</p>
  </div>;
}

export function OperationalPair() {
 return <section id="controls" className={`${styles.container} ${styles.supportingStrip}`} aria-label="Teamwork, learning and scale">
   <article><SceneIcon name="box"/><h3>Check older cases.</h3><p>Already refunded? In the intended workflow, review older cases for valid recovery routes, with original terms, deadlines and existing claims in view.</p></article>
   <article id="policy"><SceneIcon name="flow"/><h3>Review a rule before changing it.</h3><p>{DEMO_CASES[1].reference}: earlier refund found. Preview “review before another payout” before publishing.</p></article>
 </section>;
}

export function ConfigurationScene() {
  const settings = [
    ['box', 'Connect supported records', 'Store, helpdesk, 3PL and carrier coverage.'],
    ['user', 'Set rules and owners', 'Approvals, exceptions and follow-up.'],
    ['flow', 'Review a case', 'Check evidence, decide and verify the result.'],
  ] as const;
  return <figure className={styles.configurationScene} data-story-artifact="configuration">
    <div className={styles.configurationIntro}><SceneIcon name="flow"/><h3>Start with your existing tools.</h3><p>Confirm coverage and manual steps.</p></div>
    <dl>{settings.map(([icon,label,value])=><div key={label}><dt><SceneIcon name={icon}/>{label}</dt><dd>{value}</dd></div>)}</dl>
    <figcaption>Illustrative configuration · no connections or actions activated.</figcaption>
  </figure>;
}

/** Restored source-to-case spider diagram, grounded in the canonical fictional case. */
export function ConnectedEvidenceScene() {
  return <div className={`${styles.evidenceAssembly} ${styles.connectedEvidence}`} data-story-artifact="connected-evidence" aria-label="Connected evidence using fictional product data">
    <svg className={styles.evidenceLines} viewBox="0 0 1312 600" fill="none" aria-hidden="true"><path d="M300 155C408 155 410 220 544 253M390 414C471 414 468 327 552 297M980 126C867 126 879 206 772 244M968 418C857 418 856 326 767 292" stroke="#aaaeb2" strokeWidth="1.2" strokeDasharray="3 5"/></svg>
    <div className={`${styles.sourceFragment} ${styles.sourceOrder}`}><div className={styles.fragmentHeader}><SceneIcon name="box"/><span>Store record</span></div><div className={styles.fragmentItem}><span>{landingCase.reference}</span><strong>{DEMO_PRESENTATION.recoverable.item}</strong><span>{DEMO_PRESENTATION.recoverable.sku} · Qty 1</span><b>{money(landingCase.amount)}</b></div><div className={styles.fragmentFoot}>Customer refund request</div></div>
    <div className={`${styles.sourceFragment} ${styles.sourcePacking}`}><div className={styles.fragmentHeader}><SceneIcon name="file"/><span>3PL · Warehouse records</span></div><div className={styles.packingComparison}><div><span>Ordered</span><strong>{DEMO_PRESENTATION.recoverable.sku}</strong></div><SceneIcon name="arrow"/><div><span>Packed</span><strong>Wrong item</strong></div></div><div className={styles.fragmentFoot}><SceneIcon name="check"/>Warehouse error acknowledged</div></div>
    <div className={styles.evidenceGateNode}><UnauthLogo kind="lockup" tone="graphite" height={32} decorative/><h3>One shared case.</h3><span>Evidence + your rules</span></div>
    <div className={`${styles.sourceFragment} ${styles.sourcePayment}`}><div className={styles.fragmentHeader}><SceneIcon name="money"/><span>Refund history</span><small>GBP</small></div><dl><div><dt>Previously refunded</dt><dd>{money(landingCase.priorRefund)}</dd></div><div><dt>Current request</dt><dd>{money(landingCase.amount)}</dd></div></dl><div className={styles.fragmentFoot}>No earlier refund recorded</div></div>
    <div className={`${styles.sourceFragment} ${styles.sourceConversation}`}><div className={styles.conversationLabel}><SceneIcon name="chat"/>Customer conversation</div><div className={styles.customerMessage}><p>{DEMO_PRESENTATION.recoverable.issue}.</p><span>Reported issue · {landingCase.reference}</span></div></div>

  </div>;
}
