import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import {
  DEMO_CASES, DEMO_VERSION, RECOVERY_STAGES, advanceDemo, confirmDemoChoice,
  demoAmounts, demoUrl, emptyDemoProgress, type DemoCase,
} from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import styles from '../landing.module.css';

const [legitimate, duplicate, recoverable] = DEMO_CASES;
const money = (minor: number | undefined) => minor === undefined ? 'Unavailable' : formatMoney(minor, 'GBP');
const replacementCost = legitimate.replacementGoods === undefined || legitimate.replacementShipping === undefined
  ? undefined : legitimate.replacementGoods + legitimate.replacementShipping;

function Glyph({ kind = 'record' }: { kind?: 'record' | 'check' | 'arrow' | 'layers' | 'review' }) {
  const paths = {
    record: 'M6 3h7l4 4v14H3V3h3m7 0v5h5M7 12h6m-6 4h6',
    check: 'm5 12 4 4L19 6',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    layers: 'm12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6',
    review: 'M12 8v5m0 4v.01M9 3h6l7 17H2L9 3Z',
  };
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={paths[kind]} stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Frame({ id, label, children, className = '', caption = 'Fictional example · GBP' }: {
  id: string; label: string; children: ReactNode; className?: string; caption?: string;
}) {
  return <figure className={`${styles.bentoFrame} ${className}`} data-artifact-slot={id} data-artifact-state="ready" data-demo-fixture={DEMO_VERSION} aria-label={label}>
    {children}
    <figcaption className={styles.bentoCaption}><span>{label}</span><span>{caption}</span></figcaption>
  </figure>;
}

function PaperLines() {
  return <span className={styles.paperLines} aria-hidden="true"><i /><i /><i /></span>;
}

export function GateHybridBento() {
  return <Frame id="shared-evidence-gate" label="A request reaches the same evidence gate" className={styles.gateBento} caption="Asterlane staging view · focused crop">
    <div className={`${styles.artScene} ${styles.gateScene}`}>
      <div className={styles.gateInputs} aria-label="Request origins">
        <div><span className={styles.gateActorIcon}><Glyph kind="review" /></span><span><small>Support team</small><strong>Customer asks for a refund</strong></span></div>
        <div><span className={styles.gateActorIcon}><Glyph kind="layers" /></span><span><small>AI agent</small><strong>Proposes the next action</strong></span></div>
      </div>
      <div className={styles.gateConnector} aria-hidden="true"><i /><span>Evidence gate</span><i /></div>
      <div className={styles.gateProductCrop}>
        <Image src="/product-proof/hero-case-gate-hold-signal-3420x1920.png" alt="Focused Asterlane case view showing a recommendation, merchant decision controls and source evidence" width={3420} height={1920} sizes="(max-width: 1100px) calc(100vw - 84px), 980px" loading="eager" />
      </div>
      <div className={styles.gateDecisionCard}>
        <span>Gate result</span><strong>Hold for evidence</strong>
        <p>Proof of delivery is missing. Ask the carrier for clarification before acting.</p>
        <div><span>Matched rule</span><b>Delivery evidence required</b></div>
      </div>
    </div>
  </Frame>;
}

export function CaseWorkspaceBento() {
  return <Frame id="case-workspace" label="The evidence behind the decision" className={styles.heroBento}>
    <div className={`${styles.artScene} ${styles.workspaceScene}`}>
      <div className={styles.workspaceGhost} aria-hidden="true" />
      <div className={styles.workspaceWindow}>
        <aside className={styles.workspaceRail}>
          <div className={styles.workspaceBrand}><UnauthLogo kind="symbol" tone="graphite" height={20} /><span>Unauth</span></div>
          <div className={styles.railTitle}><Glyph kind="layers" /> Sample cases</div>
          {DEMO_CASES.map(sample => <Link key={sample.id} href={demoUrl(sample.id)} className={sample.id === legitimate.id ? styles.railCurrent : undefined}><span className={styles.mono}>{sample.reference}</span><span>{sample.title}</span></Link>)}
          <span className={styles.railProvenance}>Product walkthrough</span>
        </aside>
        <div className={styles.workspaceMain}>
          <div className={styles.windowBar}><span>Cases <span className={styles.breadcrumbSlash}>/</span> <span className={styles.mono}>{legitimate.reference}</span></span><span className={styles.waitingState}>Awaiting decision</span></div>
          <div className={styles.workspaceContent}>
            <h3>{legitimate.title}</h3>
            <p>{legitimate.facts[1]}</p>
            <div className={styles.evidenceAttachment}><Glyph /><span>Original order <span>One original item</span></span><strong>{money(legitimate.amount)}</strong></div>
            <div className={styles.evidenceAttachment}><Glyph kind="check" /><span>Damage evidence<span>Matches the original item</span></span></div>
            <Link href={demoUrl(legitimate.id)} className={styles.artLink}>Inspect this case <Glyph kind="arrow" /></Link>
          </div>
        </div>
      </div>
      <div className={styles.floatingDecision}>
        <span className={styles.decisionHeading}>Compare resolutions</span>
        <div><span>Refund</span><strong>{money(legitimate.amount)}</strong></div>
        <div><span>Same-item replacement</span><strong>{money(replacementCost)}</strong></div>
        <Link href={demoUrl(legitimate.id, 'decide')}>Review your options <Glyph kind="arrow" /></Link>
        <span className={styles.decisionNote}>Known immediate costs · no choice made</span>
      </div>
    </div>
  </Frame>;
}

export function CaseFigure({ sample }: { sample: DemoCase }) {
  return <Frame id={`claim-${sample.id}`} label={sample.reference} className={styles.caseFigure} caption="Fictional · GBP">
    <div className={`${styles.artScene} ${styles.smallScene}`}>
      {sample.id === legitimate.id ? <div className={styles.evidenceStack}>
        <div className={styles.stackSheet} aria-hidden="true"><PaperLines /></div>
        <div className={styles.stackSheet} aria-hidden="true"><PaperLines /></div>
        <div className={styles.stackSheet}><Glyph kind="record" /><span>{sample.title}</span><strong>{money(sample.amount)}</strong><span className={styles.mono}>{sample.reference}</span></div>
      </div> : sample.id === duplicate.id ? <div className={styles.duplicateSheets}>
        <div className={styles.payoutSheet}><span>Prior refund</span><strong>{money(sample.priorRefund)}</strong><span className={styles.mono}>{sample.reference}</span><PaperLines /></div>
        <div className={styles.payoutSheet}><span>New request</span><strong>{money(sample.amount)}</strong><span>Same original item</span><Glyph kind="review" /></div>
      </div> : <div className={styles.ceilingPlot}>
        <div><span>Refund request</span><strong>{money(sample.amount)}</strong><i style={{ height: '135px' }} /></div>
        <div><span>Agreement ceiling</span><strong>{money(sample.ceiling)}</strong><i style={{ height: sample.ceiling === undefined ? 0 : `${sample.ceiling / sample.amount * 135}px` }} /></div>
      </div>}
    </div>
  </Frame>;
}

export function ResolutionBento() {
  return <Frame id="resolution-comparison" label={`One case. The available choices. · ${legitimate.reference}`}>
    <div className={`${styles.artScene} ${styles.resolutionScene}`}>
      <svg className={styles.branchLines} viewBox="0 0 1200 480" preserveAspectRatio="none" aria-hidden="true"><path d="M360 240H540Q560 240 560 220V142Q560 122 580 122H700M540 240Q560 240 560 260V338Q560 358 580 358H700" /></svg>
      <div className={styles.claimSheet}><Glyph /><span className={styles.mono}>{legitimate.reference}</span><h3>Original claim</h3><strong>{money(legitimate.amount)}</strong><p>{legitimate.facts[2]}</p><PaperLines /></div>
      <div className={styles.branchChoices}>
        <Link href={demoUrl(legitimate.id, 'decide')} className={styles.choicePaper}><span><Glyph kind="arrow" /><span>Refund<small>Known immediate cost</small></span></span><strong>{money(legitimate.amount)}</strong></Link>
        <Link href={demoUrl(legitimate.id, 'decide')} className={styles.choicePaper}><span><Glyph kind="layers" /><span>Same-item replacement<small>{money(legitimate.replacementGoods)} goods + {money(legitimate.replacementShipping)} shipping</small></span></span><strong>{money(replacementCost)}</strong></Link>
        <span className={styles.branchNote}>Or request review. The merchant decides.</span>
      </div>
    </div>
  </Frame>;
}

function completedRecoverableOutcome() {
  let progress = confirmDemoChoice(recoverable, emptyDemoProgress(), 'refund-recovery', 'Illustrative landing walkthrough');
  progress = advanceDemo(recoverable, progress, 'refund');
  for (let stage = 1; stage < RECOVERY_STAGES.length; stage++) progress = advanceDemo(recoverable, progress, stage);
  return demoAmounts(recoverable, progress);
}

function RecoveryBoard() {
  return <div className={styles.recoveryBoardCrop}>
    <div className={styles.recoveryBoardHeader}><span>Recovery work</span><span className={styles.mono}>3 active stages</span></div>
    {[['Investigate', recoverable.reference, 'Warehouse acknowledgement'], ['Prepare claim', duplicate.reference, 'Evidence review'], ['Reconcile', legitimate.reference, 'Payment matching']].map(([stage, reference, task]) => <div className={styles.recoveryBoardRow} key={stage}>
      <span className={styles.recoveryStageMark}><Glyph kind="check" />{stage}</span><span><strong>{task}</strong><small className={styles.mono}>{reference}</small></span><span>Owner assigned</span>
    </div>)}
  </div>;
}

export function ResponsibilityBento() {
  return <Frame id="responsibility-evidence" label={`Responsibility remains an evidence question · ${recoverable.reference}`} caption="Fictional evidence · no liability inferred">
    <div className={`${styles.artScene} ${styles.responsibilityScene}`}>
      <div className={styles.responsibilitySource}><Glyph kind="check" /><span>Warehouse acknowledgement<strong>Packing error accepted</strong></span></div>
      <div className={styles.responsibilityQuestion}><Glyph kind="review" /><span>Responsibility question<strong>Evidence still required</strong><small>Parcel weight and location not supplied</small></span></div>
      <div className={styles.responsibilityTerm}><Glyph kind="record" /><span>Recovery agreement<strong>{money(recoverable.ceiling)} ceiling</strong></span></div>
      <div className={styles.responsibilityRule} aria-hidden="true"><i /><span>Review before handoff</span><i /></div>
    </div>
  </Frame>;
}

export function RecoveryBento() {
  return <Frame id="recovery-work" label={`Recovery work stays separate from the customer decision · ${recoverable.reference}`} caption="Fictional recovery workflow · manual handoff">
    <div className={`${styles.artScene} ${styles.recoveryScene}`}>
      <RecoveryBoard />
    </div>
  </Frame>;
}

export function OutcomeBento() {
  const amounts = completedRecoverableOutcome();
  return <Frame id="evidence-to-outcome" label={`An example financial outcome · ${recoverable.reference}`} caption="Simulated completed path · GBP">
    <div className={`${styles.artScene} ${styles.outcomeScene}`}>
      <div className={styles.compactBridge}>
        <div className={styles.bridgeHeading}><span>Financial outcome</span><span className={styles.mono}>{recoverable.reference}</span></div>
        <div><span>Refund observed</span><strong>{money(amounts.refunded)}</strong></div>
        <div><span>Provider response</span><strong>{RECOVERY_STAGES[2]}</strong></div>
        <div><span>{RECOVERY_STAGES[3]}</span><strong>{money(amounts.received)}</strong></div>
        <div><span>{RECOVERY_STAGES[4]}</span><strong>{money(amounts.received)}</strong></div>
        <div><span>Reconciled recovery</span><strong>− {money(amounts.reconciled)}</strong></div>
        <div className={styles.balanceLine}><span>Remaining loss</span><strong>{money(amounts.balance)}</strong></div>
      </div>
    </div>
  </Frame>;
}

export function PolicyBento() {
  return <Frame id="policy-preview" label={`A policy change, before publication · ${legitimate.reference}`} className={styles.halfBento}>
    <div className={`${styles.artScene} ${styles.policyScene}`}>
      <div className={styles.policyCodePanel}>
        <div className={styles.policyCodeHeader}><span>Damage policy</span><span>Preview</span></div>
        <ol className={styles.policyCodeLines}>
          <li><span>01</span><code><b>IF</b> damage evidence matches original item</code></li>
          <li><span>02</span><code><b>THEN</b> {legitimate.choices.slice(0, 2).map(choice => choice.label).join(' or ')}</code></li>
          <li><span>03</span><code><b>ELSE</b> {legitimate.choices[2].label}</code></li>
        </ol>
        <p className={styles.policyCodeNote}>Current evidence preview · one sample case</p>
      </div>
      <aside className={styles.policyAnnotation}>
        <span>Current-evidence comparison</span>
        <strong>Affected exposure <b>{money(legitimate.amount)}</b></strong>
        <div><span>Current example</span><b>{legitimate.choices.slice(0, 2).map(choice => choice.label).join(' or ')}</b></div>
        <div><span>Proposed example</span><b>{legitimate.choices[2].label}</b></div>
        <small>No policy published.</small>
      </aside>
    </div>
  </Frame>;
}

export function PatternsBento() {
  return <Frame id="claim-patterns" label="Too few cases to establish recurrence" className={styles.halfBento} caption="Fictional sample · 3 orders">
    <div className={`${styles.artScene} ${styles.patternScene}`}>
      <div className={styles.patternPlot}>
        <div className={styles.patternPlotHeading}><span>Reported issues</span><span>Cases</span></div>
        {DEMO_CASES.map(sample => <div className={styles.patternPlotRow} key={sample.id}><span>{sample.title}<small className={styles.mono}>{sample.reference}</small></span><div><i /><strong>1</strong></div></div>)}
        <div className={styles.patternScale} aria-hidden="true"><span>0</span><span>5</span></div>
        <p>Below the five-case recurrence threshold</p>
      </div>
    </div>
  </Frame>;
}

export function CoverageProgression() {
  return <div className={styles.coverageProgression} aria-label="Source coverage progression">
    <div className={styles.coverageProgressionLead}>
      <h3>Coverage is a set of separate checks.</h3>
      <p>Source setup, evidence fit and freshness answer different questions. This fictional case keeps each state visible before a decision or recovery handoff.</p>
    </div>
    <div className={styles.coverageFeatureList}>
      <div className={styles.coverageFeature}>
        <span className={styles.coverageFeatureIndex}>01</span>
        <div><h4>Commerce records</h4><p>Original order and the requested amount are present in the sample.</p><span className={styles.coverageFeatureStatus}>Present in this fictional case</span></div>
      </div>
      <div className={styles.coverageFeature}>
        <span className={styles.coverageFeatureIndex}>02</span>
        <div><h4>Fulfilment evidence</h4><p>The packing image and warehouse acknowledgement support the packing-error account.</p><span className={styles.coverageFeatureStatus}>Present in this fictional case</span></div>
      </div>
      <div className={styles.coverageFeature}>
        <span className={styles.coverageFeatureIndex}>03</span>
        <div><h4>Agreement terms</h4><p>The recovery agreement includes an illustrative {money(recoverable.ceiling)} ceiling.</p><span className={styles.coverageFeatureStatus}>Present in this fictional case</span></div>
      </div>
      <div className={styles.coverageFeature}>
        <span className={styles.coverageFeatureIndex}>04</span>
        <div><h4>Freshness and gaps</h4><p>Parcel weight and location are not supplied, and no provider is connected to the sample.</p><span className={styles.coverageFeatureStatus}>Incomplete sample · freshness not supplied</span></div>
      </div>
    </div>
  </div>;
}

export function CoverageBento() {
  return <Frame id="source-coverage" label={`The records behind one case · ${recoverable.reference}`} caption="Fictional evidence · no provider connected">
    <div className={`${styles.artScene} ${styles.coverageScene}`}>
      <svg className={styles.sourcePaths} viewBox="0 0 1200 440" preserveAspectRatio="none" aria-hidden="true"><path d="M300 100H425Q450 100 450 125V195Q450 220 475 220H600M900 100H775Q750 100 750 125V195Q750 220 725 220H600M300 340H425Q450 340 450 315V245Q450 220 475 220H600M900 340H775Q750 340 750 315V245Q750 220 725 220H600" /></svg>
      <div className={`${styles.sourcePaper} ${styles.sourceOrder}`}><Glyph /><span>Original order<strong>{money(recoverable.amount)}</strong></span></div>
      <div className={`${styles.sourcePaper} ${styles.sourcePacking}`}><Glyph /><span>Packing image<strong>Wrong item shown</strong></span></div>
      <div className={`${styles.sourcePaper} ${styles.sourceWarehouse}`}><Glyph /><span>Warehouse acknowledgement<strong>Packing error accepted</strong></span></div>
      <div className={`${styles.sourcePaper} ${styles.sourceAgreement}`}><Glyph /><span>Recovery agreement<strong>{money(recoverable.ceiling)} ceiling</strong></span></div>
      <div className={styles.sourceHub}><UnauthLogo kind="symbol" tone="graphite" height={48} /><span>One case</span><span className={styles.mono}>{recoverable.reference}</span></div>
      <div className={styles.missingSource}><Glyph kind="review" /><span>Parcel weight &amp; location not supplied</span></div>
    </div>
  </Frame>;
}
