'use client';

import { formatMoney } from '@/lib/utils/format';
import { DEMO_CASES, type DemoCase } from '@/lib/demo/merchantCaseV1';
import styles from './public.module.css';

/** Read-only product illustration of the initial canonical case, not a live screen. */
export function EvidenceGate() {
  const sample = DEMO_CASES.find(item => item.id === 'recoverable')!;
  return <figure className={styles.heroCase} aria-label="Wrong-item claim: evidence, customer recommendation and separate recovery opportunity">
    <figcaption><span className={styles.mono}>{sample.reference}</span><span>Product illustration · Fictional case</span></figcaption>
    <div className={styles.heroCaseTitle}><h2>A wrong item.<br />Two jobs to put it right.</h2><p>Customer request <strong className={styles.mono}>{formatMoney(sample.amount, 'GBP')}</strong></p></div>
    <dl className={styles.heroFacts}>
      <div><dt>Order record</dt><dd>{sample.facts[0]}</dd></div>
      <div><dt>Packing evidence</dt><dd>{sample.facts[1]}</dd></div>
    </dl>
    <div className={styles.heroRoute}><span>Recommended customer route</span><h3>{sample.choices[0].label}</h3><p>The packing evidence supports putting the customer’s order right. Your team reviews and records the decision.</p></div>
    <div className={styles.heroOpportunity}><div><strong>Separate recovery opportunity</strong><p>Eligible agreement ceiling · not money received</p></div><strong className={styles.mono}>{formatMoney(sample.ceiling!, 'GBP')}</strong></div>
    <p className={styles.artifactNote}>Illustrative GBP amounts. No refund paid or claim submitted in this initial example.</p>
  </figure>;
}

export function CaseEvidenceVisual({ sample }: { sample: DemoCase }) {
  return <div className={styles.caseEvidence} aria-label={`${sample.title} evidence preview`}>
    <div className={styles.evidenceReceipt}><span className={styles.mono}>{sample.reference}</span><span>Fictional evidence</span></div>
    <h4>The facts behind this decision.</h4>
    <ul className={styles.factList}>{sample.facts.map((fact, index) => <li key={fact}><span className={styles.factNumber}>0{index + 1}</span><p>{fact}</p></li>)}</ul>
    <div className={styles.optionStrip}><span>Options to review</span><p>{sample.choices.map(choice => choice.label).join(' / ')}</p></div>
  </div>;
}

// Each preview is an excerpt of the canonical fictional case, not a second fixture.
const evidenceExcerpts = [
  { caseIndex: 2, factIndex: 0, label: 'Original order', note: 'Keep order value distinct from the cost of resolving the claim.' },
  { caseIndex: 1, factIndex: 1, label: 'Earlier concession', note: 'Review the earlier refund before deciding on an additional payout.' },
  { caseIndex: 2, factIndex: 1, label: 'Supporting evidence', note: 'Read the customer report alongside the evidence available for this case.' },
  { caseIndex: 2, factIndex: 3, label: 'Evidence gap', note: 'Missing information remains visible. A connection alone does not establish liability.' },
  { caseIndex: 0, factIndex: 2, label: 'Example policy', note: 'Permitted options inform the recommendation. The merchant makes the decision.' },
];
export function EvidenceFocus({ selected }: { selected: number }) {
  const excerpt = evidenceExcerpts[selected];
  const sample = DEMO_CASES[excerpt.caseIndex];
  return <div className={styles.evidenceFocus}>
    <div className={styles.evidenceReceipt}><span className={styles.mono}>{sample.reference}</span><span>Fictional case</span></div>
    <div className={styles.focusRail} aria-hidden="true">{evidenceExcerpts.map((item, index) => <span key={item.label} data-active={selected === index}/>)}</div>
    <div key={selected} className={styles.focusExcerpt}><span>{excerpt.label}</span><h4>{sample.facts[excerpt.factIndex]}</h4><p>{excerpt.note}</p></div>
    <p className={styles.focusFoot}>Evidence first. A reason you can inspect.</p>
  </div>;
}
