import {
  classifyClaimType,
  detectChargebackThreatened,
  detectIsClaim,
  inferOutcomeFromMacros,
  scoreSentiment,
} from '@/lib/support/intake/classifyClaim';

describe('classifyClaimType', () => {
  it('classifies "never arrived" as INR with high confidence', () => {
    const result = classifyClaimType('my package never arrived');
    expect(result.claimType).toBe('INR');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies "completely smashed" as damaged with high confidence', () => {
    const result = classifyClaimType('item came completely smashed');
    expect(result.claimType).toBe('damaged');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies "wrong size" as wrong_item with high confidence', () => {
    const result = classifyClaimType('you sent me the wrong size');
    expect(result.claimType).toBe('wrong_item');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies "looks nothing like the photos" as not_as_described', () => {
    const result = classifyClaimType('looks nothing like the photos');
    expect(result.claimType).toBe('not_as_described');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('treats a generic delivery question as other / not a claim', () => {
    const result = classifyClaimType('I just have a question about delivery');
    expect(result.claimType).toBe('other');
    expect(detectIsClaim('I just have a question about delivery')).toBe(false);
  });

  it('handles empty input gracefully', () => {
    expect(classifyClaimType('')).toEqual({ claimType: 'other', confidence: 0 });
    expect(classifyClaimType(undefined, null)).toEqual({ claimType: 'other', confidence: 0 });
    expect(detectIsClaim('')).toBe(false);
  });

  it('picks the highest-confidence category on mixed signals', () => {
    // "not what I ordered" (wrong_item 0.92) should beat a bare "broken" (damaged 0.85).
    const result = classifyClaimType('this is broken and also not what I ordered');
    expect(result.claimType).toBe('wrong_item');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('matches against subject and body together', () => {
    const result = classifyClaimType('Order issue', 'the parcel never arrived at my address');
    expect(result.claimType).toBe('INR');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies INR through curly apostrophes (real mail-client wording)', () => {
    // "haven’t received" with a typographic apostrophe must still hit INR.
    const result = classifyClaimType('Hi, I still haven’t received order #1008. I’d like a refund please.');
    expect(result.claimType).toBe('INR');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it.each([
    ['where is my order #1008'],
    ['my package never arrived'],
    ["I haven't received my order"],
    ['I would like a refund because it never arrived'],
    ['has not arrived'],
    ['missing parcel'],
  ])('treats %p as an INR claim', (text) => {
    expect(detectIsClaim(text)).toBe(true);
    expect(classifyClaimType(text).claimType).toBe('INR');
  });

  it('flags refund-only language as a claim without forcing an INR type', () => {
    expect(detectIsClaim("I'd like a refund please")).toBe(true);
  });

  it('does not overclassify a neutral order-status question', () => {
    const text = 'Can you tell me when my order will arrive?';
    expect(detectIsClaim(text)).toBe(false);
    expect(classifyClaimType(text).claimType).toBe('other');
  });
});

describe('detectChargebackThreatened', () => {
  it('detects an explicit bank-dispute threat', () => {
    expect(detectChargebackThreatened("I'll just dispute with my bank")).toBe(true);
    expect(detectChargebackThreatened('I will file a chargeback if not refunded')).toBe(true);
  });

  it('does not flag neutral language', () => {
    expect(detectChargebackThreatened('please let me know the status')).toBe(false);
  });
});

describe('scoreSentiment', () => {
  it('returns negative for threatening language', () => {
    expect(scoreSentiment('this is a scam, I am furious and want a refund')).toBeLessThan(0);
  });
  it('returns positive for grateful language', () => {
    expect(scoreSentiment('thank you so much, this was excellent and helpful')).toBeGreaterThan(0);
  });
  it('returns 0 for neutral text', () => {
    expect(scoreSentiment('the order number is 1007')).toBe(0);
  });
});

describe('inferOutcomeFromMacros', () => {
  it('infers approved from a "Refund Approved" macro', () => {
    expect(inferOutcomeFromMacros(['Refund Approved'])).toBe('approved');
  });
  it('infers denied from a rejection macro', () => {
    expect(inferOutcomeFromMacros(['Claim Denied'])).toBe('denied');
  });
  it('returns null when nothing is inferable', () => {
    expect(inferOutcomeFromMacros(['Greeting'])).toBeNull();
    expect(inferOutcomeFromMacros([])).toBeNull();
  });

  it('does not infer outcome from tags (macros only)', () => {
    expect(inferOutcomeFromMacros(['refund-approved tag was applied'])).toBe('approved');
  });
});
