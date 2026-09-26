import { safeDesktopReturnUrl } from '@/lib/device/desktopSupport';
import { DEMO_CASES, DEMO_VERSION, DEMO_LAUNCH_STORY, DEMO_LANDING_WORK, DEMO_LANDING_RECOVERY_SCENARIO, DEMO_RECEIPT_REVIEW, demoRecoveryView, resolveDemoUrl, emptyDemoProgress, confirmDemoChoice, advanceDemo, demoAmounts, demoComplete, readDemoProgress, demoStorageKey } from '@/lib/demo/merchantCaseV1';

describe('public causal demo', () => {
  it('keeps recognised public case context in the desktop link without copying arbitrary case data', () => {
    expect(safeDesktopReturnUrl({ origin: 'https://example.test', pathname: '/demo', search: '?case=duplicate&step=outcome&token=secret' })).toBe('https://example.test/demo?case=duplicate&step=outcome');
    expect(safeDesktopReturnUrl({ origin: 'https://example.test', pathname: '/demo', search: '?case=private-order' })).toBe('https://example.test/demo');
  });
  test.each(DEMO_CASES.flatMap(c => c.choices.map(choice => ({ c, choice }))))('$c.id / $choice.id records only a reviewed local choice', ({ c, choice }) => {
    const empty = emptyDemoProgress();
    if (choice.rationale) expect(confirmDemoChoice(c, empty, choice.id, '  ')).toEqual(empty);
    const p = confirmDemoChoice(c, empty, choice.id, 'Reviewed the prior concession');
    expect(p.decision).toBe(choice.id);
    expect(p.refundObserved).toBe(false);
    expect(p.replacementDispatched).toBe(false);
    expect(p.recovery).toBe(0);
    expect(confirmDemoChoice(c, p, c.choices[0].id, 'change')).toBe(p);
    if (['review', 'escalate'].includes(choice.id)) {
      expect(demoComplete(c, advanceDemo(c, advanceDemo(c, p, 'refund'), 1))).toBe(false);
    }
  });
  it('separates refund, approval, receipt and reconciliation in minor units', () => {
    const c = DEMO_CASES[2];
    let p = confirmDemoChoice(c, emptyDemoProgress(), 'refund-recovery', '');
    expect(advanceDemo(c, p, 3)).toBe(p);
    p = advanceDemo(c, p, 1); p = advanceDemo(c, p, 2);
    expect(demoAmounts(c, p)).toEqual({ refunded: 0, received: 0, reconciled: 0, balance: 0 });
    p = advanceDemo(c, p, 3);
    expect(demoAmounts(c, p).received).toBe(15000);
    expect(demoAmounts(c, p).reconciled).toBe(0);
    expect(advanceDemo(c, p, 3)).toBe(p);
    p = advanceDemo(c, p, 4); p = advanceDemo(c, p, 5);
    expect(demoComplete(c, p)).toBe(false);
    p = advanceDemo(c, p, 'refund'); p = advanceDemo(c, p, 'refund');
    expect(demoAmounts(c, p)).toEqual({ refunded: 24800, received: 15000, reconciled: 15000, balance: 9800 });
    expect(demoComplete(c, p)).toBe(true);
  });
  it('observes goodwill only once and does not turn exposure into savings', () => {
    const c = DEMO_CASES[1];
    let p = confirmDemoChoice(c, emptyDemoProgress(), 'goodwill', 'Exception reviewed');
    expect(demoAmounts(c, p).refunded).toBe(12800);
    p = advanceDemo(c, advanceDemo(c, p, 'refund'), 'refund');
    expect(demoAmounts(c, p).refunded).toBe(25600);
  });
  it('prevents incompatible events and does not mutate fixture facts', () => {
    const before = JSON.stringify(DEMO_CASES); const c = DEMO_CASES[0];
    const p = confirmDemoChoice(c, emptyDemoProgress(), 'replace', '');
    expect(advanceDemo(c, p, 'refund')).toBe(p);
    expect(demoComplete(c, advanceDemo(c, p, 'replacement'))).toBe(true);
    expect(JSON.stringify(DEMO_CASES)).toBe(before);
  });
  test.each(['case=wrong&step=outcome', 'case=duplicate&step=wrong', 'case=duplicate&x=y', 'case=duplicate&case=legitimate', 'step=__proto__'])('normalises invalid URL %s', query => {
    expect(resolveDemoUrl(new URLSearchParams(query))).toEqual({ caseId: 'legitimate', step: 'inspect' });
  });
  test.each([['incoming', 'inspect'], ['evidence', 'inspect'], ['recommendation', 'decide'], ['decision', 'decide'], ['recovery', 'outcome']])('maps legacy %s', (old, next) => {
    expect(resolveDemoUrl(new URLSearchParams(`step=${old}`)).step).toBe(next);
  });
  it('isolates versions and cases and validates corrupt storage', () => {
    const c = DEMO_CASES[2]; const p = advanceDemo(c, confirmDemoChoice(c, emptyDemoProgress(), 'refund-recovery', ''), 1);
    const serialize = (version: string, caseId: string) => JSON.stringify({ version, caseId, progress: p });
    expect(readDemoProgress(c, serialize(DEMO_VERSION, c.id))).toEqual(p);
    expect(readDemoProgress(c, serialize('old', c.id))).toEqual(emptyDemoProgress());
    expect(readDemoProgress(DEMO_CASES[0], serialize(DEMO_VERSION, c.id))).toEqual(emptyDemoProgress());
    expect(readDemoProgress(c, '{')).toEqual(emptyDemoProgress());
    expect(demoStorageKey(c.id)).not.toEqual(demoStorageKey('duplicate'));
  });
});


describe('landing presentation isolation', () => {
  it('keeps the fully built launch story internally consistent without changing demo progress', () => {
    const launch = DEMO_LAUNCH_STORY;
    const sample = DEMO_CASES.find(item => item.id === launch.caseId)!;
    expect(launch.customerPolicy.proposedRefundReview).toEqual({ operator: 'above', amount: 50000 });
    expect(launch.customerResolution.amount).toBe(sample.amount);
    expect(launch.customerResolution.amount).toBeLessThanOrEqual(launch.customerPolicy.proposedRefundReview.amount);
    expect(launch.money.recovered + launch.money.unrecoveredRefundBalance).toBe(launch.customerResolution.amount);
    expect(launch.money.recovered).toBe(launch.recoveryAgreement.ceiling);
    expect(launch.gates.map(gate => gate.route)).toEqual(expect.arrayContaining(['Block duplicate payout', 'Assign manual review', 'Assign evidence review']));
    expect(launch.gates.flatMap(gate => [gate.condition, gate.route]).join(' ')).not.toMatch(/\bdeny\b|hold refund/i);
    expect(launch.setupStages.map(stage => stage.label)).toEqual(['Upload or connect', 'Extract', 'Review', 'Publish']);
    expect(emptyDemoProgress()).toEqual({decision:null,rationale:'',refundObserved:false,replacementDispatched:false,recovery:0});
  });
  it('keeps the fictional later path ordered and outside persisted demo progress', () => {
    const scenario=DEMO_LANDING_RECOVERY_SCENARIO;
    expect(scenario.caseId).toBe('recoverable');
    expect(Object.values(scenario.states).map(state=>state.stage)).toEqual([0,1,2,3,4,5]);
    expect(scenario.states.current.illustrative).toBe(false);
    expect(scenario.states.prepared.assumptions).toHaveLength(2);
    expect(scenario.states.submitted.reference).toBe('ILLUSTRATIVE-SUBMISSION-248');
    expect(scenario.states.receipt.reference).toBe(DEMO_RECEIPT_REVIEW.reference);
    expect(emptyDemoProgress().recovery).toBe(0);
  });
  it('links distinct tasks to existing cases without extending the interactive case set', () => {
    expect(DEMO_CASES.map(item => item.id)).toEqual(['legitimate', 'duplicate', 'recoverable', 'not-received']);
    expect(new Set(DEMO_LANDING_WORK.map(item => item.id)).size).toBe(DEMO_LANDING_WORK.length);
    for (const task of DEMO_LANDING_WORK) {
      expect(DEMO_CASES.some(item => item.id === task.caseId)).toBe(true);
      expect(task.owner.trim()).not.toBe('');
      expect(task.title.trim()).not.toBe('');
    }
  });
  it('keeps later receipt review unreconciled and derives the completed balance through canonical transitions', () => {
    const before=JSON.stringify(DEMO_CASES);
    const review=demoRecoveryView('received');
    expect(review.sample.id).toBe(DEMO_RECEIPT_REVIEW.caseId);
    expect(review.progress.recovery).toBe(3);
    expect(review.amounts).toEqual({refunded:24800,received:15000,reconciled:0,balance:24800});
    const complete=demoRecoveryView('reconciled');
    expect(complete.progress.recovery).toBe(5);
    expect(complete.amounts).toEqual({refunded:24800,received:15000,reconciled:15000,balance:9800});
    expect(emptyDemoProgress()).toEqual({decision:null,rationale:'',refundObserved:false,replacementDispatched:false,recovery:0});
    expect(JSON.stringify(DEMO_CASES)).toBe(before);
  });
});
