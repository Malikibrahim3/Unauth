'use client';

import {
  EVIDENCE_STRENGTH_LABELS,
  type EvidenceChecklistResult,
} from '@/lib/payouts/types';
import { TONE_STYLE, strengthTone } from '@/components/claims/payout/payoutCopy';

export function EvidenceChecklistCard({ evidence }: { evidence: EvidenceChecklistResult }) {
  const tone = TONE_STYLE[strengthTone(evidence.strength)];
  const hasMissing = evidence.items.some((i) => i.state === 'missing');

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Evidence on file
        </p>
        <span
          className="inline-block text-xs font-semibold rounded-full px-2.5 py-1"
          style={{ background: tone.bg, color: tone.color }}
        >
          {EVIDENCE_STRENGTH_LABELS[evidence.strength]}
        </span>
      </div>

      {evidence.items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No supporting evidence on file yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.items.map((item) => {
            const isPresent = item.state === 'present';
            const isMissing = item.state === 'missing';
            const mark = isPresent ? '✓' : isMissing ? '○' : '–';
            const markColor = isPresent ? 'var(--success)' : 'var(--text-tertiary)';
            return (
              <li key={item.key} className="flex items-start gap-2 text-sm">
                <span aria-hidden style={{ color: markColor, lineHeight: '1.4' }}>
                  {mark}
                </span>
                <span style={{ color: isPresent ? 'var(--text)' : 'var(--text-secondary)' }}>
                  {item.label}
                  {item.state === 'not_tracked' && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {' '}
                      · not tracked
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasMissing && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Missing items weaken the case — request evidence from the customer or carrier before paying out.
        </p>
      )}
    </section>
  );
}
