/**
 * RUN-12 — exhaustive persisted-enum labels.
 *
 * Every enum value that can reach the merchant-facing UI must have an explicit
 * label. Reaching the `humanise()` fallback is a contract failure, so this
 * suite asserts coverage against the *generated* database types rather than a
 * hand-maintained list: adding a value to a rendered enum without adding its
 * label fails here, and adding a brand-new enum forces an explicit decision
 * about whether it is merchant-rendered.
 */
import { readFileSync } from 'node:fs';
import { label, type LabelFamily } from '@/lib/ui/labels';
import { dataQualityEvents, resetDataQuality } from '@/lib/observability/dataQuality';
import { EVIDENCE_STRENGTHS } from '@/lib/payouts/types';

/** Parses `Enums: { … }` out of the generated Supabase types. */
function persistedEnums(): Map<string, string[]> {
  const source = readFileSync('lib/supabase/types.ts', 'utf8');
  const publicSchema = source.slice(source.indexOf('  public: {'));
  const start = publicSchema.indexOf('    Enums: {');
  const end = publicSchema.indexOf('    CompositeTypes: {', start);
  const block = publicSchema.slice(start, end);

  const enums = new Map<string, string[]>();
  // Entries are either `name: "a" | "b"` or a multi-line `name:\n | "a"\n | "b"`.
  const pattern = /^ {6}(\w+):((?:[^\n]*\n(?: {8}\|[^\n]*\n)*)|[^\n]*\n)/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block)) !== null) {
    const values = [...match[2].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
    if (values.length > 0) enums.set(match[1], values);
  }
  return enums;
}

/**
 * Persisted enum → the label family that renders it. Every entry here is
 * asserted to be exhaustively labelled.
 */
const RENDERED_ENUMS: Record<string, LabelFamily> = {
  claim_status: 'caseStatus',
  claim_type: 'claimType',
  requested_action: 'requestedAction',
  recoverability: 'recoverability',
  loss_attribution: 'attribution',
  invite_status: 'inviteStatus',
};

/**
 * Enums that are never rendered as merchant-facing copy. Each needs a reason,
 * so "not rendered" stays a decision rather than an oversight.
 */
const NOT_MERCHANT_RENDERED: Record<string, string> = {};

describe('RUN-12 persisted enum label coverage', () => {
  const enums = persistedEnums();

  beforeEach(() => resetDataQuality());

  it('parses the generated database enums', () => {
    expect(enums.size).toBeGreaterThan(20);
    expect(enums.get('claim_status')).toContain('awaiting_carrier_response');
  });

  it.each(Object.entries(RENDERED_ENUMS))(
    'labels every value of %s without falling back',
    (enumName, family) => {
      const values = enums.get(enumName);
      if (!values) throw new Error(`${enumName} is not present in the generated types`);

      const unlabelled: string[] = [];
      for (const value of values) {
        const rendered = label(family, value);
        expect(rendered).not.toBe('');
        // A raw snake_case value must never reach the DOM.
        expect(rendered).not.toMatch(/_/);
        if (dataQualityEvents().some((event) => event.subject === `${family}.${value}`)) {
          unlabelled.push(value);
        }
      }
      expect(unlabelled).toEqual([]);
    },
  );

  it('records an unmapped value as a monitored contract failure with a safe label', () => {
    const rendered = label('caseStatus', 'a_value_that_is_not_mapped');
    // Safe and explicit, never raw.
    expect(rendered).toBe('A value that is not mapped');
    const events = dataQualityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('label.enum_unmapped');
    expect(events[0].subject).toBe('caseStatus.a_value_that_is_not_mapped');
  });

  it('renders null and empty values as empty rather than reporting a failure', () => {
    expect(label('caseStatus', null)).toBe('');
    expect(label('caseStatus', '')).toBe('');
    expect(dataQualityEvents()).toEqual([]);
  });

  /*
   * Not every rendered enum lives in the database. Code-level unions are
   * equally capable of producing an unlabelled badge — `EvidenceStrength` did.
   */
  it.each([['evidenceStrength', EVIDENCE_STRENGTHS]])(
    'labels every value of the %s code union',
    (family, values) => {
      const unlabelled = (values as readonly string[]).filter((value) => {
        resetDataQuality();
        label(family as LabelFamily, value);
        return dataQualityEvents().length > 0;
      });
      expect(unlabelled).toEqual([]);
    },
  );

  it('accounts for every rendered enum explicitly', () => {
    for (const name of Object.keys(RENDERED_ENUMS)) {
      expect(enums.has(name)).toBe(true);
    }
    for (const name of Object.keys(NOT_MERCHANT_RENDERED)) {
      expect(RENDERED_ENUMS[name]).toBeUndefined();
    }
  });
});
