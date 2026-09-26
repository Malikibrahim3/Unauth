/** The only fictional fact and transition authority for public previews and demos. */
export const DEMO_VERSION = 'merchant-cases-v2';
export const DEMO_CAPABILITY = 'Unauth gathers evidence, records your decision and prepares the next step. Refunds, replacements and claim submissions are completed in your existing tools.';
export const DEMO_CASE_STEPS = ['inspect', 'decide', 'outcome'] as const;
export type DemoStep = typeof DEMO_CASE_STEPS[number];
// Accepted only at the legacy public adapter boundary.
export type DemoCaseStep = 'incoming' | 'evidence' | 'recommendation' | 'decision' | 'recovery';
export type DemoChoice = { id: string; label: string; detail: string; rationale?: boolean };
export type DemoCase = { id: string; title: string; reference: string; amount: number; priorRefund: number; replacementGoods?: number; replacementShipping?: number; ceiling?: number; facts: readonly string[]; choices: readonly DemoChoice[] };
export const DEMO_CASES: readonly DemoCase[] = [
  { id: 'legitimate', title: 'Legitimate claim', reference: 'SAMPLE-096', amount: 9600, priorRefund: 0, replacementGoods: 2800, replacementShipping: 500,
    facts: ['Order: one ceramic serving bowl, SKU BOWL-01, quantity 1, £96 GBP.', 'Customer damage photo matches the original bowl. No prior concession.', 'Example policy permits a full refund or the same item as a replacement.', 'Example replacement cost: £28 goods plus £5 shipping. Stock is available in this fictional scenario.'],
    choices: [{ id: 'refund', label: 'Refund', detail: 'Prepare a £96 GBP refund in your existing commerce tool.' }, { id: 'replace', label: 'Replace', detail: 'Prepare one BOWL-01 from the original order with a £33 GBP authorised cost budget (£28 goods + £5 shipping). Retail value is £96, not replacement cost.' }, { id: 'review', label: 'Request review', detail: 'Keep the case unresolved for a colleague to review the existing damage evidence and permitted options.' }] },
  { id: 'duplicate', title: 'Duplicate payout', reference: 'SAMPLE-128', amount: 12800, priorRefund: 12800,
    facts: ['Order: one canvas jacket, SKU JACKET-01, quantity 1, £128 GBP.', 'A prior £128 GBP refund is confirmed in the fictional commerce record.', 'The new request covers the same original item.', '£128 duplicate exposure identified. This is not proven savings.'],
    choices: [{ id: 'no-payout', label: 'No additional payout', detail: 'Record no further payout. Prepare a manual support handoff explaining the prior refund; no customer message is sent.' }, { id: 'escalate', label: 'Escalate', detail: 'Keep the case unresolved for a colleague to review the duplicate concession.' }, { id: 'goodwill', label: 'Goodwill exception', detail: 'Prepare an additional £128 GBP refund. If later observed, total refunds become £256 GBP. Explain why another concession is justified.', rationale: true }] },
  { id: 'recoverable', title: 'Recoverable fulfilment loss', reference: 'SAMPLE-248', amount: 24800, priorRefund: 0, ceiling: 15000,
    facts: ['Order: one wool coat, SKU COAT-01, quantity 1, £248 GBP refund request.', 'Example packing image shows the wrong item. Fictional warehouse acknowledgement accepts the packing error.', 'Fictional agreement WH-DEMO-01 caps this eligible recovery at £150 GBP.', 'Parcel weight and warehouse location are not supplied. No carrier liability is inferred.'],
    choices: [{ id: 'refund-recovery', label: 'Refund and prepare recovery', detail: 'Prepare a £248 GBP refund in your commerce tool and a separate recovery handoff with packing evidence, warehouse acknowledgement and the £150 GBP fictional agreement ceiling.' }, { id: 'review', label: 'Request review', detail: 'Keep the case unresolved for a colleague to review the packing evidence and agreement before a decision.' }] },
  { id: 'not-received', title: 'Item not received', reference: 'SAMPLE-NR248', amount: 24800, priorRefund: 0, ceiling: 15000,
    facts: ['Order: one wool coat, SKU COAT-01, quantity 1, £248 GBP refund request.', 'The customer reports that the order never arrived. A fictional carrier collection scan and investigation confirm the parcel was lost after collection; no delivery scan is recorded.', 'Fictional carrier agreement CARRIER-DEMO-01 establishes a £150 GBP eligible recovery ceiling. Claimant and submission channel still need confirmation.', 'No earlier refund is recorded. The example policy permits a full refund independently of carrier recovery.'],
    choices: [{ id: 'refund-recovery', label: 'Refund and prepare recovery', detail: 'Prepare a £248 GBP refund and a separate carrier claim using the collection record, confirmed-loss investigation and £150 GBP agreement ceiling. No action is executed.' }, { id: 'review', label: 'Request review', detail: 'Keep this case unresolved for review of the carrier investigation or a policy exception.' }] },
];
export const DEMO_FEATURED_CASE_IDS = ['not-received', 'recoverable', 'legitimate'] as const;
export type DemoProgress = { decision: string | null; rationale: string; refundObserved: boolean; replacementDispatched: boolean; recovery: number };
export const emptyDemoProgress = (): DemoProgress => ({ decision: null, rationale: '', refundObserved: false, replacementDispatched: false, recovery: 0 });
export const RECOVERY_STAGES = ['Prepared', 'Submitted', 'Provider approved', 'Received', 'Matched', 'Reconciled'] as const;
export const demoStorageKey = (id: string) => `unauth:demo:${DEMO_VERSION}:${id}`;
export function demoUrl(id: string, step: DemoStep = 'inspect') { return `/demo?case=${id}&step=${step}`; }
export function resolveDemoUrl(params: URLSearchParams): { caseId: string; step: DemoStep } {
  const id = params.get('case') ?? 'legitimate';
  const raw = params.get('step') ?? 'inspect';
  const old: Record<string, DemoStep> = { incoming: 'inspect', context: 'inspect', sources: 'inspect', evidence: 'inspect', recommendation: 'decide', decision: 'decide', recovery: 'outcome' };
  const step = DEMO_CASE_STEPS.includes(raw as DemoStep) ? raw as DemoStep : Object.prototype.hasOwnProperty.call(old, raw) ? old[raw] : null;
  if (!DEMO_CASES.some(c => c.id === id) || !step || [...params.keys()].some(k => k !== 'case' && k !== 'step') || params.getAll('case').length > 1 || params.getAll('step').length > 1) return { caseId: 'legitimate', step: 'inspect' };
  return { caseId: id, step };
}
export function confirmDemoChoice(c: DemoCase, p: DemoProgress, id: string, rationale: string): DemoProgress {
  const choice = c.choices.find(x => x.id === id);
  if (p.decision || !choice || (choice.rationale && !rationale.trim())) return p;
  return { ...p, decision: id, rationale: rationale.trim().slice(0, 1000) };
}
export function advanceDemo(c: DemoCase, p: DemoProgress, event: 'refund' | 'replacement' | number): DemoProgress {
  if (!p.decision) return p;
  if (event === 'refund' && ['refund', 'goodwill', 'refund-recovery'].includes(p.decision)) return { ...p, refundObserved: true };
  if (event === 'replacement' && p.decision === 'replace') return { ...p, replacementDispatched: true };
  if (typeof event === 'number' && c.ceiling && p.decision === 'refund-recovery' && event === p.recovery + 1 && event <= 5) return { ...p, recovery: event };
  return p;
}
export function readDemoProgress(c: DemoCase, raw: string | null): DemoProgress {
  const empty = emptyDemoProgress();
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.version !== DEMO_VERSION || saved.caseId !== c.id || !saved.progress) return empty;
    const p = saved.progress;
    let valid = confirmDemoChoice(c, empty, p.decision, typeof p.rationale === 'string' ? p.rationale : '');
    if (p.refundObserved === true) valid = advanceDemo(c, valid, 'refund');
    if (p.replacementDispatched === true) valid = advanceDemo(c, valid, 'replacement');
    if (Number.isInteger(p.recovery) && p.recovery >= 0 && p.recovery <= 5) for (let n = 1; n <= p.recovery; n++) valid = advanceDemo(c, valid, n);
    return valid;
  } catch { return empty; }
}
export function demoAmounts(c: DemoCase, p: DemoProgress) {
  const refunded = c.priorRefund + (p.refundObserved ? c.amount : 0);
  const received = p.recovery >= 3 ? c.ceiling ?? 0 : 0;
  const reconciled = p.recovery >= 5 ? c.ceiling ?? 0 : 0;
  return { refunded, received, reconciled, balance: refunded - reconciled };
}
export function demoComplete(c: DemoCase, p: DemoProgress) {
  return p.decision === 'no-payout' || p.replacementDispatched || (p.refundObserved && (!c.ceiling || p.recovery === 5));
}

/** Concise presentation fields for the same cases; no additional event or outcome. */
export const DEMO_PRESENTATION: Record<string, { item: string; sku: string; image: string; issue: string; record: string; route: string }> = {
  'not-received': { item: 'Wool coat', sku: 'COAT-01', image: '/demo/items/wool-coat.jpg', issue: 'Item not received', record: 'Lost after collection', route: 'Refund and prepare recovery' },
  legitimate: { item: 'Ceramic serving bowl', sku: 'BOWL-01', image: '/demo/items/ceramic-bowl.jpg', issue: 'Arrived damaged', record: 'Damage photo matches the item', route: 'Refund or replace' },
  duplicate: { item: 'Canvas jacket', sku: 'JACKET-01', image: '/demo/items/canvas-jacket.jpg', issue: 'Another refund requested', record: 'Prior refund confirmed', route: 'Review the earlier refund' },
  recoverable: { item: 'Wool coat', sku: 'COAT-01', image: '/demo/items/wool-coat.jpg', issue: 'Wrong item received', record: 'Packing error acknowledged', route: 'Refund and prepare recovery' },
};

/** Exact visual counterparts for the isolated sample evidence, never live source records. */
export const DEMO_EVIDENCE_VISUALS: Record<string,
  | { kind: 'photo'; src: string; alt: string; label: string }
  | { kind: 'record'; label: string; result: string; source: string }
> = {
  recoverable: { kind: 'photo', src: '/demo/evidence/wrong-item-packing.jpg', alt: 'Fictional sample packing photo: a grey shirt in the parcel instead of the ordered wool coat.', label: 'Packing photo' },
  legitimate: { kind: 'photo', src: '/demo/evidence/damaged-bowl.jpg', alt: 'Fictional sample customer photo: a chipped rim on the ivory ceramic serving bowl.', label: 'Damage photo' },
  duplicate: { kind: 'record', label: 'Commerce', result: 'Refund', source: 'Recorded' },
};

/** Static source evidence for the supervised not-received demo before any provider action. */
export const DEMO_SOURCE_PRESENTATION = {
  caseId: 'not-received',
  currency: 'GBP',
  quantity: 1,
  message: 'My order never arrived. I’ve paid £248 and have nothing. I need my money back.',
  packed: 'Collected',
  acknowledgement: 'Loss confirmed',
  carrierRecord: 'No delivery scan',
  status: 'Refund requested',
} as const;

/** Example merchant policy threshold for the not-received landing scene. */
export const DEMO_NOT_RECEIVED_REVIEW_THRESHOLD = 50000;

/**
 * Canonical fully built launch story for the marketing landing.
 *
 * This is intentionally separate from browser-local interactive demo progress:
 * the landing shows how the completed product operates across a dated sequence,
 * while the interactive demo remains a safe, supervised simulation. Every
 * amount is stored in integer minor units and every later state has its own
 * timestamp so a blocked claim is never presented as simultaneously paid.
 */
export const DEMO_LAUNCH_STORY = {
  version: 'landing-launch-v1',
  caseId: 'not-received',
  reference: 'SAMPLE-NR248',
  item: 'Wool coat',
  sku: 'COAT-01',
  currency: 'GBP',
  customerPolicy: {
    name: 'Customer refund policy',
    state: 'Published',
    actionMode: 'Automatic',
    proposedRefundReview: {
      operator: 'above',
      amount: DEMO_NOT_RECEIVED_REVIEW_THRESHOLD,
    },
  },
  recoveryAgreement: {
    name: 'CARRIER-DEMO-01',
    state: 'Published',
    clausesReviewed: true,
    ceiling: 15000,
  },
  setupStages: [
    { label: 'Upload or connect', detail: 'Customer policies and partner agreements' },
    { label: 'Extract', detail: 'Candidate rules with source clauses' },
    { label: 'Review', detail: 'Terms, scope and affected outcomes' },
    { label: 'Publish', detail: 'Versioned rules Unauth may apply' },
  ],
  evidence: {
    paidAt: '1 Sep · 14:03',
    packedAt: '2 Sep · 15:10',
    handedToCarrierAt: '2 Sep · 16:40',
    collectedAt: '2 Sep',
    lossConfirmedAt: '10 Sep',
    deliveryScan: 'None',
    priorRefund: 0,
  },
  customerResolution: {
    amount: 24800,
    state: 'Issued',
    mode: 'Automatic',
    provider: 'Shopify',
    providerResult: 'Confirmed',
    decidedAt: '10 Sep · 11:26',
  },
  recovery: {
    blockedAt: '10 Sep · 11:27',
    blocker: 'Confirm claimant and submission channel',
    owner: 'Amelia Reed',
    ownerInitials: 'AR',
    reviewIfUnresolved: '22 Sep 2026',
    routeConfirmedAt: '11 Sep · 10:12',
    submittedAt: '11 Sep · 10:12',
    approvedAt: '18 Sep · 14:40',
    receivedAt: '23 Sep · 09:08',
    matchedAt: '24 Sep · 09:02',
    reconciledAt: '24 Sep · 09:12',
  },
  money: {
    recovered: 15000,
    unrecoveredRefundBalance: 9800,
  },
  gates: [
    { condition: 'Earlier or reserved refund for the same item', route: 'Block duplicate payout', tone: 'critical' },
    { condition: 'Proposed refund above the published limit', route: 'Assign manual review', tone: 'review' },
    { condition: 'Required evidence is missing or contradictory', route: 'Assign evidence review', tone: 'neutral' },
    { condition: 'Published policy requires claim-history review', route: 'Assign manual review', tone: 'review' },
    { condition: 'Carrier confirms loss after collection', route: 'Refund + assess claim', tone: 'positive' },
    { condition: '3PL confirms a packing error', route: 'Apply policy + assess claim', tone: 'positive' },
    { condition: 'Damage evidence matches and replacement is eligible', route: 'Replace', tone: 'positive' },
  ],
} as const;

/** Landing presentation of possible policy inputs and the facts shown by this sample. */
export const DEMO_LANDING_EVIDENCE_TYPES = [
  'Carrier status', '3PL records', 'Customer history', 'Refund amount',
  'Previous claims', 'Previous refunds', 'Delivery proof', 'Payment records',
] as const;
export const DEMO_LANDING_SOURCE_SCOPE = [
  { label: '3PL records', state: 'No 3PL finding used' },
  { label: 'Customer history', state: 'No history finding shown' },
  { label: 'Previous claims', state: 'No claim-history finding shown' },
  { label: 'Delivery proof', state: 'No proof shown; no delivery scan' },
  { label: 'Payment records', state: 'New refund and recovery not recorded' },
] as const;
export const DEMO_LANDING_CASE_CHECKS: Record<string, string> = {
  'not-received': 'Carrier loss confirmed · no earlier refund · £248 below review limit',
  recoverable: 'Packing error acknowledged · no earlier refund · £150 recovery ceiling',
  legitimate: 'Damage photo matches · no prior concession · stock available',
};

/** Intended automatic policy illustrations only; never persisted as demo or live decisions. */
export const DEMO_LANDING_POLICY_OUTCOMES: Record<string, {
  action: 'refund' | 'replace' | 'no-additional-payout';
  rule: string;
  reason: string;
  risk: string;
}> = {
  'not-received': {
    action: 'refund',
    rule: 'Confirmed parcel loss + no earlier refund + proposed refund not above £500 → full refund',
    reason: 'The carrier confirms the parcel is lost. Unauth selects a full refund and prepares a separate carrier claim.',
    risk: 'The customer has nothing. You face the refund and an unpaid carrier claim.',
  },
  recoverable: {
    action: 'refund',
    rule: 'Acknowledged packing error + no earlier refund → full refund',
    reason: 'The warehouse accepts the error. Unauth selects a full refund and prepares a separate recovery claim.',
    risk: 'The customer needs a refund. The warehouse agreement will not cover all of it.',
  },
  duplicate: {
    action: 'no-additional-payout',
    rule: 'Same item + full refund already recorded → no additional payout',
    reason: 'The original item has already been refunded in full. A further payout needs an authorised exception.',
    risk: 'The refund has already gone out. Another request could make you pay twice.',
  },
  legitimate: {
    action: 'replace',
    rule: 'Matching damage + no earlier concession + stock available → replace',
    reason: 'Your rule selects the available same-item replacement. Exceptions go to a person.',
    risk: 'The customer has a broken item. The remedy needs to be right the first time.',
  },
};

/** Faithful explanations of the existing fictional permitted choices, not live rules. */
export const DEMO_GATE_PRESENTATION: Record<string, { policy: string; conciseRule: string; nextAction: string; evidenceLabel: string }> = {
  'not-received': { policy: 'Confirmed parcel loss permits a full refund and separate carrier recovery.', conciseRule: 'Confirmed loss + no earlier refund → full refund', nextAction: 'Prepare the refund and confirm the carrier submission route.', evidenceLabel: 'Carrier investigation' },
  legitimate: { policy: 'The example policy permits a full refund or the same item as a replacement.', conciseRule: 'Matching damage photo + no earlier refund → refund or replace', nextAction: 'Review the refund and replacement options before deciding.', evidenceLabel: 'Customer damage photo' },
  duplicate: { policy: 'Review the earlier refund before another concession. Escalation and a reasoned goodwill exception remain available.', conciseRule: 'Same item + earlier refund → review before another payout', nextAction: 'Check the same-item refund and decide whether any further remedy is justified.', evidenceLabel: 'Earlier commerce refund' },
  recoverable: { policy: 'Example policy: when the warehouse acknowledges the wrong item and no earlier concession is recorded, send the refund recommendation for merchant approval.', conciseRule: 'Warehouse error + no earlier refund → refund review', nextAction: 'Review the £248 refund; separately confirm who may submit a claim and where.', evidenceLabel: 'Packing evidence and warehouse acknowledgement' },
};

/** Landing-only explanations of the three existing choices, with no extra decision state. */
export const DEMO_LANDING_CASE_LESSONS: Record<string, { problem: string; reason: string; benefit: string }> = {
  legitimate: { problem: 'The ceramic serving bowl arrived damaged.', reason: 'The matching photo and absence of an earlier concession allow two remedies under the example policy.', benefit: 'Help a genuine customer with a suitable remedy.' },
  duplicate: { problem: 'Another refund is requested for the same canvas jacket.', reason: 'The commerce record already shows a refund for that original item; this calls for review, not a fraud finding.', benefit: 'Check earlier compensation before approving more.' },
  recoverable: { problem: 'The customer received the wrong item.', reason: 'Packing evidence and the warehouse acknowledgement support a refund recommendation; the separate agreement may support a limited claim.', benefit: 'One investigation supports the customer remedy and a separate eligible claim.' },
};

/** Presentation-only assignment. It creates no task and establishes no provider deadline. */
export const DEMO_WORK_EXAMPLE = {
  caseId: 'not-received',
  owner: 'Amelia Reed',
  initials: 'AR',
  role: 'Recovery operator',
  action: 'Review the evidence pack',
  reviewDate: '22 Sep 2026',
  reviewTime: '10:00 · Europe/London',
  qualification: 'Fictional assignment and merchant-set review date',
} as const;

/** Existing SAMPLE-248 facts reused in public preparation; no new outcome. */
export const DEMO_RECOVERY_PRESENTATION = {
  agreement: 'WH-DEMO-01',
  evidence: 'The packing evidence and warehouse acknowledgement record a packing error.',
  supportingRecords: ['Order record', 'Packing evidence', 'Warehouse acknowledgement'],
} as const;

export const DEMO_DELIVERY_RECOVERY_PRESENTATION = {
  agreement: 'CARRIER-DEMO-01',
  evidence: 'The collection scan and carrier investigation confirm loss after collection.',
  supportingRecords: ['Order record', 'Collection scan', 'Carrier loss confirmation'],
  receiptReference: 'RECEIPT-NR248',
} as const;

/** Legacy supervised presentation views; separate from the fully built launch sequence and never persisted. */
export const DEMO_LANDING_WORK = [
  { id: 'WORK-NR248', caseId: 'not-received', title: 'Confirm claimant and submission channel', owner: DEMO_WORK_EXAMPLE.owner, initials: DEMO_WORK_EXAMPLE.initials, status: 'Missing evidence', reviewDate: DEMO_WORK_EXAMPLE.reviewDate, context: 'Collection scan, loss confirmation and agreement retained' },
  { id: 'WORK-NR248-REFUND', caseId: 'not-received', title: 'Complete the selected customer refund', owner: 'Theo Morgan', initials: 'TM', status: 'Not executed', reviewDate: '22 Sep 2026', context: 'Item not received · no earlier refund recorded' },
] as const;

/** Legacy conditional SAMPLE-248 receipt view, with no match or reconciliation. */
export const DEMO_RECEIPT_REVIEW = {
  caseId: 'recoverable',
  reference: 'RECEIPT-248',
  source: 'Merchant-supplied receipt',
  currency: 'GBP',
  state: 'Awaiting match',
  qualification: 'Illustrative later receipt review',
} as const;

/** Legacy SAMPLE-248 explanation only. These events are not current demo progress or provider observations. */
export const DEMO_LANDING_RECOVERY_SCENARIO = {
  id: 'sample-248-later-path',
  caseId: 'recoverable',
  states: {
    current: { id: 'sample-248-later-path-current', stage: 0, illustrative: false, source: 'Fictional current case', assumptions: [] as readonly string[], reference: 'SAMPLE-248' },
    prepared: { id: 'sample-248-later-path-prepared-later', stage: 1, illustrative: true, source: 'Illustrative merchant preparation', assumptions: ['Claimant confirmed for this illustration', 'Warehouse claim route confirmed for this illustration'], reference: 'SAMPLE-248', claimant: 'Sample merchant', channel: 'Sample warehouse claims desk' },
    submitted: { id: 'sample-248-later-path-submitted-later', stage: 2, illustrative: true, source: 'Illustrative submission', assumptions: ['Prepared claim submitted through the assumed confirmed route'], reference: 'ILLUSTRATIVE-SUBMISSION-248' },
    approved: { id: 'sample-248-later-path-approved-later', stage: 3, illustrative: true, source: 'Illustrative warehouse response', assumptions: ['£150 claim approved', 'Payment evidence not yet verified'], reference: 'ILLUSTRATIVE-SUBMISSION-248' },
    receipt: { id: 'sample-248-later-path-receipt-later', stage: 4, illustrative: true, source: DEMO_RECEIPT_REVIEW.source, assumptions: ['Merchant supplied a £150 receipt for review'], reference: DEMO_RECEIPT_REVIEW.reference },
    reconciled: { id: 'sample-248-later-path-reconciled-later', stage: 5, illustrative: true, source: 'Illustrative verified allocation', assumptions: ['£248 refund observed', '£150 received, matched and reconciled'], reference: DEMO_RECEIPT_REVIEW.reference },
  },
} as const;

export function demoRecoveryView(view: 'received' | 'reconciled', caseId: string = DEMO_RECEIPT_REVIEW.caseId) {
  const sample = DEMO_CASES.find(item => item.id === caseId)!;
  let progress = confirmDemoChoice(sample, emptyDemoProgress(), 'refund-recovery', '');
  progress = advanceDemo(sample, progress, 'refund');
  for (let stage = 1; stage <= (view === 'received' ? 3 : 5); stage++) progress = advanceDemo(sample, progress, stage);
  return { sample, progress, amounts: demoAmounts(sample, progress) };
}
