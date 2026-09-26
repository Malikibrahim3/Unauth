import Image from 'next/image';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DEMO_CASES, DEMO_PRESENTATION, DEMO_SOURCE_PRESENTATION, DEMO_DELIVERY_RECOVERY_PRESENTATION as DEMO_RECOVERY_PRESENTATION, DEMO_LANDING_WORK, DEMO_NOT_RECEIVED_REVIEW_THRESHOLD, DEMO_LANDING_EVIDENCE_TYPES, DEMO_LANDING_SOURCE_SCOPE } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { PolicyReviewScene, SceneIcon, SceneWindow, WorkQueueScene } from './LandingScenes';
import { LandingArtifact } from './LandingArtifact';
import styles from './public.module.css';

const sample = DEMO_CASES.find(item => item.id === DEMO_SOURCE_PRESENTATION.caseId)!;
const source = DEMO_SOURCE_PRESENTATION;
const item = DEMO_PRESENTATION[sample.id];
const money = (amount: number) => formatMoney(amount, source.currency);

/** The same fictional item not received across source evidence and shared work. */
export function ConnectedWorkStory() {
  return <section id="workflow" className={`${styles.container} ${styles.chapter} ${styles.storyTransformation}`} aria-labelledby="story-before-title">
    <div className={styles.storyBeforeIntro}>
      <h2 id="story-before-title" className={styles.heading}>The order never arrived.<br/><span>Your {money(sample.amount)} refund.</span></h2>
      <p className={styles.lead}>The customer has paid and received nothing. You owe a refund, while the carrier’s agreement covers only {money(sample.ceiling!)}. Close the ticket and the recovery can be left behind.</p>
    </div>
    <div className={styles.sourceCasePair}>
    <LandingArtifact id="source-records" title="The whole picture." subtitle="Evidence and gaps together." className={styles.sourceEvidenceArtifact}
      details={<><p className={styles.artifactDetailLead}>One missing order. A customer to refund and a loss to recover.</p><dl className={styles.artifactFactList}><div><dt>Customer request</dt><dd>One {item.item.toLowerCase()}, {item.sku}, quantity {source.quantity}. The customer requests {money(sample.amount)} because their order never arrived. No earlier refund is recorded.</dd></div><div><dt>Carrier investigation</dt><dd>{DEMO_RECOVERY_PRESENTATION.evidence} Agreement {DEMO_RECOVERY_PRESENTATION.agreement} sets a {money(sample.ceiling!)} eligible ceiling.</dd></div></dl></>}>
      <div className={styles.sourceCaseSheet}>
        <div className={styles.sourceCaseHeader}>
          <div><span className={styles.sourceCaseEyebrow}>{sample.reference} · Customer claim</span><h3>{item.issue}</h3><p>{item.item} <span>·</span> {money(sample.amount)} refund request</p></div>
          <span className={styles.sourceCaseStatus}>{source.status}</span>
        </div>
        <div className={styles.sourceCaseRecords}>
          <section className={styles.sourceCaseRecord} aria-label="Order record">
            <div className={styles.sourceCaseBrand}><Image src="/providers/shopify-dark-wordmark.svg" alt="Shopify" width={108} height={31} unoptimized/></div>
            <span className={styles.sourceCaseEyebrow}>Order record · {sample.reference}</span>
            <h4>What was ordered</h4>
            <div className={styles.sourceCaseItem}><ProductThumbnail src={item.image} size={48}/><div><strong>{item.item}</strong><span>{item.sku} · Qty {source.quantity}</span></div></div>
            <dl className={styles.sourceCaseFacts}><div><dt>Order value</dt><dd>{money(sample.amount)}</dd></div><div><dt>Previous refunds</dt><dd>{money(sample.priorRefund)}</dd></div></dl>
            <div className={styles.sourceCaseRecordFoot}>Customer remedy still pending</div>
          </section>
          <section className={styles.sourceCaseRecord} aria-label="Customer conversation">
            <div className={styles.sourceCaseBrand}><Image src="/providers/gorgias-wordmark.svg" alt="Gorgias" width={108} height={29} unoptimized/></div>
            <span className={styles.sourceCaseEyebrow}>Customer report · {sample.reference}</span>
            <h4>What the customer reported</h4>
            <blockquote className={styles.sourceCaseMessage}>{source.message}</blockquote>
            <div className={styles.sourceCaseRecordFoot}>Nothing received · full refund requested</div>
          </section>
          <section className={styles.sourceCaseRecord} aria-label="Carrier collection and investigation">
            <div className={styles.sourceCaseBrand}><SceneIcon name="box"/><span>Carrier</span></div>
            <span className={styles.sourceCaseEyebrow}>Carrier record · {sample.reference}</span>
            <h4>What the carrier record shows</h4>
            <dl className={styles.sourceCaseFacts}><div><dt>Carrier status</dt><dd>{source.acknowledgement}</dd></div><div><dt>Collection scan</dt><dd>{source.packed}</dd></div><div><dt>Delivery scan</dt><dd>{source.carrierRecord}</dd></div></dl>
            <div className={styles.sourceCaseRecordFoot}>Evidence supports a carrier claim</div>
          </section>
        </div>
      </div>
    </LandingArtifact>
    <LandingArtifact id="source-decision" title="Your policy." subtitle="Two separate outcomes." className={styles.sourceDecisionArtifact}
      details={<><p className={styles.artifactDetailLead}>The same evidence leads to two separate routes.</p><dl className={styles.artifactFactList}><div><dt>Policy applied</dt><dd>Confirmed carrier loss, no earlier refund and a {money(sample.amount)} claim below the {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)} review threshold select a full refund. Confirmed loss and the carrier agreement support preparing a separate claim up to {money(sample.ceiling!)}.</dd></div><div><dt>Other policy inputs</dt><dd>3PL records, customer history, previous claims, delivery proof and payment records can affect other policies. This sample does not establish findings for those inputs; no new refund or recovery receipt is recorded.</dd></div></dl><p>Unauth selects a full refund and prepares a separate carrier claim. Submission stays on hold until the claimant and channel are confirmed.</p></>}>
      <div className={`${styles.sourceCaseSheet} ${styles.sourceDecisionSheet}`}>
        <div className={styles.sourceCaseRecords}>
          <section className={styles.sourceCaseRecord} aria-label="Carrier recovery agreement">
            <div className={styles.sourceCaseBrand}><SceneIcon name="file"/><span>Agreement</span></div>
            <span className={styles.sourceCaseEyebrow}>{DEMO_RECOVERY_PRESENTATION.agreement}</span>
            <h4>Recovery limit</h4>
            <dl className={styles.sourceCaseFacts}><div><dt>Eligible ceiling</dt><dd>{money(sample.ceiling!)}</dd></div><div><dt>Refund requested</dt><dd>{money(sample.amount)}</dd></div><div><dt>Claim submitted</dt><dd>No</dd></div></dl>
            <div className={styles.sourceCaseRecordFoot}>The agreement cannot cover the whole refund</div>
          </section>
        </div>
        <div className={styles.sourceCaseScope} aria-label="Other policy inputs for this sample">
          <div className={styles.sourceCaseScopeIntro}><strong>Other rules can also use</strong><span>These records can change a route when available. This refund does not depend on them.</span></div>
          <dl>{DEMO_LANDING_SOURCE_SCOPE.map(input=><div key={input.label}><dt>{input.label}</dt><dd>{input.state}</dd></div>)}</dl>
        </div>
        <div className={styles.sourceCasePolicy} aria-label="Merchant policy applied to this case">
          <div className={styles.sourceCasePolicyHead}><strong>Your policy applied</strong><span>Policy checks shape both routes</span></div>
          <div className={styles.sourceCasePolicyRoutes}>
            <div><span>Customer rule</span><p><b>If</b> carrier loss is confirmed <b>and</b> no earlier refund exists <b>and</b> {money(sample.amount)} is below the {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)} review threshold</p></div>
            <div><span>Recovery rule</span><p><b>If</b> loss is confirmed after collection <b>and</b> agreement {DEMO_RECOVERY_PRESENTATION.agreement} limits eligible recovery to {money(sample.ceiling!)}</p></div>
          </div>
        </div>
        <div className={styles.sourceCaseNext}>
          <div className={styles.sourceCaseDecisionHead}><SceneIcon name="arrow"/><strong>Unauth decision</strong></div>
          <div className={styles.sourceCaseDecisionOutcomes}><div><span>Customer outcome</span><strong>Refund {money(sample.amount)} selected</strong></div><div><span>Recovery outcome</span><strong>Prepare carrier claim up to {money(sample.ceiling!)}</strong></div></div>
        </div>
      </div>
    </LandingArtifact>
    </div>
    <div className={styles.storyJoined}>
      <div><UnauthLogo kind="lockup" tone="graphite" height={27}/><h2 className={styles.heading}>Resolve the customer claim.<br/><span>Don’t abandon the money.</span></h2><p className={styles.lead}>A customer refund does not settle the carrier’s share. Unauth keeps the selected remedy and recovery work connected until the money is accounted for.</p></div>
      <LandingArtifact id="shared-case" title="Decision made." subtitle="Recovery stays open." className={styles.sharedCaseArtifact}
        details={<><p className={styles.artifactDetailLead}>The customer remedy and recovery each have an owner.</p><p>Unauth selects the {money(sample.amount)} refund. Recovery reuses the collection scan and loss confirmation to prepare the separate claim under {DEMO_RECOVERY_PRESENTATION.agreement}.</p><dl className={styles.artifactFactList}><div><dt>Customer resolution</dt><dd>Your configured rule determines the refund. Exceptions go to your team.</dd></div><div><dt>Recovery</dt><dd>The {money(sample.ceiling!)} ceiling is not money received. Confirm who may claim and where to submit; customer help does not wait for carrier payment.</dd></div></dl></>}>
        <SceneWindow title={`Shared case / ${sample.reference}`}>
          <div className={styles.joinedCaseHead}><span>{item.issue}</span><strong>{money(sample.amount)} requested</strong></div>
          <div className={styles.joinedEvidence}><span><SceneIcon name="check"/>Order</span><span><SceneIcon name="check"/>Conversation</span><span><SceneIcon name="check"/>Collection scan</span><span><SceneIcon name="file"/>Loss confirmed</span></div>
          <div className={styles.joinedPolicyCheck}><span>Policy matched</span><strong>Confirmed loss · no earlier refund · below {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)}</strong></div>
          <dl className={styles.joinedCaseWork}>
            <div><dt><SceneIcon name="chat"/>Support</dt><dd>Refund {money(sample.amount)}<span>Selected by your policy</span></dd></div>
            <div><dt><SceneIcon name="box"/>Recovery</dt><dd>Prepare a claim up to {money(sample.ceiling!)}<span>{DEMO_LANDING_WORK[0].owner} · confirm submission route</span></dd></div>
            <div><dt><SceneIcon name="money"/>Money</dt><dd>Keep the unpaid claim in view<span>No claim submitted or receipt recorded</span></dd></div>
          </dl>
        </SceneWindow>
      </LandingArtifact>
    </div>
  </section>;
}

export function HumanAiGateStory() {
  return <section id="gate" className={`${styles.container} ${styles.chapter} ${styles.gateStory}`} aria-labelledby="gate-story-title"><span id="controls"/>
    <div className={styles.storyIntro}><h2 id="gate-story-title" className={styles.heading}>You set the policy.<br/><span>Unauth makes the call.</span></h2><p className={styles.lead}>Choose which evidence matters, the value thresholds and when a person must approve. Unauth checks each case against your policy and explains the route it selects.</p></div>
    <LandingArtifact id="policy-gate" title="Your policy." subtitle="Applied to the evidence." className={styles.gateArtifact}
      details={<><p className={styles.artifactDetailLead}>Your policy combines evidence before it selects an outcome.</p><dl className={styles.artifactFactList}><div><dt>Matched conditions</dt><dd>The carrier confirms loss, no earlier refund is recorded and the {money(sample.amount)} claim is below your {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)} review threshold. Together, those conditions select a full refund.</dd></div><div><dt>Other routes</dt><dd>A prior refund for the same item blocks a second customer payout. Delivery proof and repeated claims, or a high-value claim with incomplete evidence, send the case to a person. A confirmed 3PL packing error can lead to a separate recovery route when the agreement supports it.</dd></div><div><dt>Separate recovery</dt><dd>The carrier loss and agreement support preparing a claim up to {money(sample.ceiling!)}. Your team confirms the claimant and submission channel before sending it.</dd></div></dl></>}>
    <div className={styles.rulesEvidence} aria-label="Evidence available for policy checks"><strong>Evidence Unauth can use</strong><ul>{DEMO_LANDING_EVIDENCE_TYPES.map(label=><li key={label}>{label}</li>)}</ul></div>
    <p className={styles.rulesPremise}>Combine available evidence into the conditions that govern each outcome.</p>
    <div className={styles.rulesBridge} aria-label="Merchant policy is checked against the evidence before customer and recovery outcomes are selected">
      <div className={styles.rulesPolicy}>
        <strong>Example policies</strong>
        <ul>
          <li className={styles.rulesPolicyMatched}><span>Carrier confirms loss + no earlier refund + claim under {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)} <em>Matched</em></span><b>Full refund + prepare carrier recovery</b></li>
          <li><span>Same item + earlier refund recorded</span><b>No further customer payout</b></li>
          <li><span>Repeated claims + delivery proof + claim above your review threshold</span><b>Human review</b></li>
          <li><span>3PL confirms packing error + wrong item + no earlier refund</span><b>Refund + prepare 3PL recovery</b></li>
        </ul>
      </div>
      <div className={styles.rulesCheckpoint}><UnauthLogo kind="symbol" tone="graphite" height={32} decorative/><strong>Unauth policy decision</strong><span className={styles.rulesCheckCount}>3 conditions matched</span><ul><li><SceneIcon name="check"/>Carrier confirms parcel lost</li><li><SceneIcon name="check"/>No earlier refund recorded</li><li><SceneIcon name="check"/>{money(sample.amount)} claim below {money(DEMO_NOT_RECEIVED_REVIEW_THRESHOLD)}</li></ul><p className={styles.rulesDecision}>Decision: <b>Full refund</b></p></div>
      <div className={styles.rulesOutcomes}>
        <div><span>Customer outcome</span><h3>Refund {money(sample.amount)}.</h3><p>Selected by your lost-parcel rule.</p></div>
        <div><span>Recovery outcome</span><h3>Prepare a carrier claim up to {money(sample.ceiling!)}.</h3><p>Submission waits for claimant and channel confirmation.</p></div>
      </div>
    </div>
    </LandingArtifact>
  </section>;
}

export function DailyWorkStory() {
  return <section id="work" className={`${styles.container} ${styles.chapter} ${styles.dailyWorkStory}`} aria-labelledby="daily-work-title">
    <div className={styles.storyIntro}><h2 id="daily-work-title" className={styles.heading}>An unowned claim<br/><span>can become your loss.</span></h2><p className={styles.lead}>Unauth identifies the blocker and keeps an owner on the next action. A resolved customer ticket must not hide an unpaid recovery.</p></div>
    <div className={styles.workStoryLayout}>
      <LandingArtifact id="daily-work" title="The next step." subtitle="With a name beside it." className={styles.workArtifact}
        details={<><p className={styles.artifactDetailLead}>Keep open work in view.</p><dl className={styles.artifactFactList}><div><dt>What needs attention</dt><dd>Missing evidence, a claim to prepare, a response to review or a payment to check.</dd></div><div><dt>Who owns it</dt><dd>A named teammate and the linked case keep the next action accountable.</dd></div><div><dt>When to return</dt><dd>A supported deadline or a merchant-set review date. A reminder is not a provider's payment promise.</dd></div></dl></>}>
        <WorkQueueScene/>
      </LandingArtifact>
      <LandingArtifact id="historical-review" title="Already refunded?" subtitle="There may still be a route." className={styles.historyArtifact}
        details={<><p className={styles.artifactDetailLead}>A completed refund does not close a separate recovery.</p><p>Review an older case against its original agreement, available evidence, applicable deadline and any existing claim before pursuing it.</p><p>If the route has expired or is unsupported, retain the reason and the remaining recorded loss. An imported case is not automatically an eligible claim.</p></>}>
        <div className={styles.workHistory}><div className={styles.historyDocument}><SceneIcon name="file"/><h4>Check older refunds for a valid recovery route.</h4><ul><li>Confirm the refund and original case evidence</li><li>Check event-date terms, claimant and deadline</li><li>Find any existing claim, receipt or open work</li></ul><p>If a valid route remains, give its next step an owner.</p></div></div>
      </LandingArtifact>
    </div>
  </section>;
}

export function LearningStory() {
  return <section id="policy" className={`${styles.container} ${styles.chapter} ${styles.learningStory}`} aria-labelledby="learning-title"><div className={styles.productChapter}>
    <div className={styles.chapterCopy}><h2 id="learning-title" className={styles.heading}>Stop debating<br/><span>the same claim again.</span></h2><p className={styles.lead}>Set the policy once. Preview its decision on this case before applying it to the next matching claim.</p></div>
    <LandingArtifact id="rule-learning" title="A better next decision." subtitle="Preview before you publish." className={styles.learningArtifact}
      details={<><p className={styles.artifactDetailLead}>Inspect the cases behind the pattern.</p><p>A recurring product, warehouse or carrier relationship is a reason to investigate. It does not establish fault or prove savings.</p><dl className={styles.artifactFactList}><div><dt>Propose</dt><dd>Write a specific change to the merchant's rules.</dd></div><div><dt>Preview</dt><dd>Review the affected cases, evidence gaps and amounts before changing a live decision path.</dd></div><div><dt>Publish</dt><dd>An authorised person reviews and confirms the change.</dd></div></dl></>}>
      <div className={styles.learningVisual}><PolicyReviewScene/></div>
    </LandingArtifact>
  </div></section>;
}
