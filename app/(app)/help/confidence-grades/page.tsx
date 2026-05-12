import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Understanding confidence grades — Unauth',
  description:
    'What definite, probable, possible, and weak confidence grades mean, and how to action each one.',
};

interface GradeRowProps {
  grade: string;
  color: string;
  meaning: string;
  signals: string;
  action: string;
}

function GradeRow({ grade, color, meaning, signals, action }: GradeRowProps) {
  return (
    <div
      className="rounded-lg p-5 space-y-3 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {grade}
        </span>
      </div>
      <div className="space-y-1.5 text-body-sm" style={{ color: 'var(--text-muted)' }}>
        <p>
          <span className="font-medium" style={{ color: 'var(--text)' }}>What it means: </span>
          {meaning}
        </p>
        <p>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Typical signals: </span>
          {signals}
        </p>
        <p>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Recommended action: </span>
          {action}
        </p>
      </div>
    </div>
  );
}

export default function ConfidenceGradesPage() {
  return (
    <div className="p-8 max-w-2xl space-y-10">
      <div className="flex items-center gap-3">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Help
        </Link>
      </div>

      <section className="space-y-4">
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          Understanding confidence grades
        </h1>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Every flagged customer in Unauth receives a confidence grade rather than a numeric score. Grades are
          designed to translate directly into operational decisions — they answer the question{' '}
          <em>"how certain should I be, and what should I do?"</em> without requiring an analyst to interpret a
          percentage or calibrate a threshold.
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          The four grades
        </h2>
        <div className="space-y-3">
          <GradeRow
            grade="Definite"
            color="var(--risk-critical)"
            meaning="We are highly confident that two or more accounts belong to the same underlying person. The evidence is convergent across multiple independent signal types."
            signals="Card fingerprint match + device ID match + overlapping IP address, or card fingerprint match + same shipping address used under different names/emails."
            action="Act on this. Review the order set, check for pattern of chargeback history, and consider holding pending orders. This grade is the primary driver for CE3.0 evidence package generation."
          />
          <GradeRow
            grade="Probable"
            color="var(--risk-high)"
            meaning="Strong evidence exists but falls short of convergent multi-signal proof. One high-quality signal (e.g. card match) combined with soft corroboration (e.g. similar name pattern, shared postcode)."
            signals="Card last 4 + billing postcode match across different emails, or device ID reuse across accounts with different card numbers."
            action="Prioritise for manual review. The pattern is suspicious enough to warrant investigation before fulfilment on high-value orders. Not sufficient alone for CE3.0 but supports narrative evidence."
          />
          <GradeRow
            grade="Possible"
            color="var(--risk-medium)"
            meaning="Overlapping signals exist but are individually explainable. The pattern is worth noting; it should not be acted on in isolation."
            signals="Shared IP address without card or device corroboration, or email address variation (e.g. firstname.lastname vs. f.lastname) without stronger linking signals."
            action="Flag for awareness. Do not block orders on this grade alone. Use it to build context when a customer later escalates to Probable or Definite, or when a chargeback arrives."
          />
          <GradeRow
            grade="Weak"
            color="var(--risk-low)"
            meaning="A single soft signal was found. This may be coincidental — shared ISP IP ranges, common name patterns, or platform-level data artefacts."
            signals="Single IP address match only, or name similarity without any corroborating signal."
            action="Treat as informational. Weak grades appear in the customer profile for completeness but should not drive any operational decision on their own."
          />
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          How grades are assigned
        </h2>
        <div className="space-y-3 text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <p>
            Grades are determined by the number and quality of matching signals, not a raw score. Signal quality
            is weighted by uniqueness — a card fingerprint is harder to share accidentally than an IP address, so
            it carries more weight. Convergence across independent signal types (card + device + network) produces
            a higher grade than depth on a single type.
          </p>
          <p>
            Grades are recalculated on every upload. If a customer appears in a new audit with stronger signal
            evidence, their grade will rise. If you dismiss a customer and they reappear with new overlapping
            accounts, they will reappear in your review queue with the updated grade.
          </p>
          <p>
            Unauth does not use machine learning to assign grades. The logic is deterministic and auditable — you
            can always see exactly which signals produced a given grade in the customer detail view.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <section className="space-y-4">
        <h2 className="text-heading-md" style={{ color: 'var(--text)' }}>
          Grades and CE3.0 eligibility
        </h2>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Visa CE3.0 chargeback dispute eligibility requires evidence that meets a specific burden of proof.
          Unauth automatically marks evidence packages as CE3.0 eligible when the underlying customer has a
          Definite confidence grade and the evidence includes at least two independent corroborating signal types.
          Probable-grade customers may qualify for narrative evidence supporting dispute but are not automatically
          flagged as CE3.0 eligible.
        </p>
      </section>

      <div className="pt-2">
        <Link
          href="/help"
          className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to Help &amp; Docs
        </Link>
      </div>
    </div>
  );
}
