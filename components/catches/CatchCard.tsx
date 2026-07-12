import Link from 'next/link';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { SIGNAL_DISPLAY_LABELS } from '@/lib/catches/types';
import type { IdentityCatchEvent } from '@/lib/catches/types';
import type { ConfidenceGradeValue } from '@/lib/confidence';

function gradeToValue(g: IdentityCatchEvent['confidenceGrade']): ConfidenceGradeValue {
  const map: Record<string, ConfidenceGradeValue> = {
    definite: 'A',
    probable: 'B',
    possible: 'C',
    weak: 'D',
  };
  return (map[g] ?? 'D') as ConfidenceGradeValue;
}

function catchHref(event: IdentityCatchEvent): string | null {
  if (event.evidencePackId) return '/claims';
  if (event.profileId) return `/customers/${event.profileId}`;
  if (event.claimId) return `/claims?highlight=${event.claimId}`;
  return null;
}

/** Compact row variant — for dashboard feed and lists */
export function CatchCardCompact({ event }: { event: IdentityCatchEvent }) {
  const href = catchHref(event);
  const signalCount = event.matchedSignalTypes.length;
  const hasExposure = event.estimatedExposureAmount != null;

  const inner = (
    <div
      className="flex items-start gap-3 rounded-md border p-3"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 20%, var(--border))',
        background: 'color-mix(in srgb, var(--accent) 3%, var(--surface))',
      }}
    >
      <ShieldAlert
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: 'var(--accent)' }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Identity variation detected
          </p>
          <ConfidenceBadge grade={gradeToValue(event.confidenceGrade)} size="sm" showLabel={false} />
        </div>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
          {event.submittedIdentifierDisplay && event.linkedIdentifierDisplay
            ? `Submitted as ${event.submittedIdentifierDisplay} · linked to ${event.linkedIdentifierDisplay}`
            : `${signalCount} matching signal${signalCount === 1 ? '' : 's'} detected`}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-xs font-medium"
            style={{ color: hasExposure ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {hasExposure
              ? `Estimated exposure: ${formatCurrencyNullable(event.estimatedExposureAmount, event.estimatedExposureCurrency)}`
              : 'Exposure unavailable'}
          </p>
          {href ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              View evidence <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  return inner;
}

/** Full card — for claim detail and standalone catches page */
export function CatchCard({ event }: { event: IdentityCatchEvent }) {
  const href = catchHref(event);
  const hasExposure = event.estimatedExposureAmount != null;

  return (
    <div
      className="rounded-[10px] border p-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border))',
        background: 'color-mix(in srgb, var(--accent) 4%, var(--surface))',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ background: 'var(--accent-soft)' }}
          >
            <ShieldAlert className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Identity variation detected
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Previously seen under another identifier
            </p>
          </div>
        </div>
        <ConfidenceBadge grade={gradeToValue(event.confidenceGrade)} size="md" />
      </div>

      {/* Narrative body */}
      <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {event.submittedIdentifierDisplay && event.linkedIdentifierDisplay ? (
          <>
            This claim was submitted under{' '}
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
              {event.submittedIdentifierDisplay}
            </span>
            , but Unauth linked it to an existing profile previously seen as{' '}
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
              {event.linkedIdentifierDisplay}
            </span>{' '}
            using hashed identity signals.
          </>
        ) : (
          'Evidence suggests this claim belongs to an existing profile. Unauth provides context; your team makes the decision.'
        )}
      </p>

      {/* Matching signals */}
      {event.matchedSignalTypes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Matching signals
          </p>
          <div className="flex flex-wrap gap-1.5">
            {event.matchedSignalTypes.map((sig) => (
              <span
                key={sig}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
                  border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border))',
                  color: 'var(--text-secondary)',
                }}
              >
                {SIGNAL_DISPLAY_LABELS[sig] ?? sig}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer — exposure + CTA */}
      <div
        className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-4"
        style={{ borderColor: 'color-mix(in srgb, var(--accent) 15%, var(--border))' }}
      >
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Estimated exposure
          </p>
          <p
            className="mt-0.5 text-base font-semibold tabular-nums"
            style={{ color: hasExposure ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {hasExposure
              ? formatCurrencyNullable(event.estimatedExposureAmount, event.estimatedExposureCurrency)
              : 'Unavailable'}
          </p>
          {hasExposure && (
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Potential loss reviewed — not a confirmed save
            </p>
          )}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            View evidence pack
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {/* Compliance note */}
      <p className="mt-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        Unauth surfaces evidence. Your team makes the decision. No automated action is taken.
      </p>
    </div>
  );
}
