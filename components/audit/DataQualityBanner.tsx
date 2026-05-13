'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DataQualityReport } from '@/lib/csv/dataQuality';

interface Props {
  report: DataQualityReport;
  runId: string;
}

/**
 * Dismissible banner shown at the top of audit results when data quality is
 * sparse or minimal. Dismissed state is persisted in localStorage per runId —
 * the only legitimate use of localStorage in this codebase (UI preference,
 * not data).
 */
export default function DataQualityBanner({ report, runId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `unauth.dqBanner.${runId}`;
    if (typeof window !== 'undefined' && localStorage.getItem(key) === 'dismissed') {
      setDismissed(true);
    }
  }, [runId]);

  const { grade } = report;
  const warnings = report.pipelineWarnings;
  const warningMessages = [
    warnings?.fastContextReadFailures
      ? `Historical fraud-entity lookups failed for ${warnings.fastContextReadFailures} batch${warnings.fastContextReadFailures === 1 ? '' : 'es'}. Some cross-batch matches may be missing.`
      : null,
    warnings?.fastContextReadRetries
      ? `Historical lookups needed ${warnings.fastContextReadRetries} retry attempt${warnings.fastContextReadRetries === 1 ? '' : 's'}.`
      : null,
    warnings?.entityResolutionErrors
      ? `Entity resolution reported ${warnings.entityResolutionErrors} error${warnings.entityResolutionErrors === 1 ? '' : 's'}. Customer profile roll-ups may be incomplete.`
      : null,
    warnings?.coOccurrenceUpstreamDown
      ? `Co-occurrence learning was skipped ${warnings.coOccurrenceUpstreamDown} time${warnings.coOccurrenceUpstreamDown === 1 ? '' : 's'} because the upstream database was unavailable.`
      : null,
    warnings?.transactionUpsertFailedRows
      ? `${warnings.transactionUpsertFailedRows.toLocaleString()} transaction row${warnings.transactionUpsertFailedRows === 1 ? '' : 's'} failed to persist. Export totals may be incomplete.`
      : null,
  ].filter(Boolean) as string[];
  const hasPipelineWarnings = warningMessages.length > 0;

  // Only show for sparse or minimal — rich/adequate need no banner
  if (dismissed || (!hasPipelineWarnings && grade !== 'sparse' && grade !== 'minimal')) return null;

  function dismiss() {
    localStorage.setItem(`unauth.dqBanner.${runId}`, 'dismissed');
    setDismissed(true);
  }

  const bannerStyle = {
    background: 'var(--risk-high-bg)',
    borderColor: 'var(--risk-high-bd)',
  };

  if (hasPipelineWarnings && grade !== 'minimal' && grade !== 'sparse') {
    return (
      <div className="flex items-start gap-3 border rounded-lg px-4 py-3" style={bannerStyle}>
        <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-high)' }}>!</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--risk-high)' }}>
            Audit completed with partial intelligence
          </p>
          {warningMessages.map((message) => (
            <p key={message} className="text-sm" style={{ color: 'var(--risk-high)' }}>
              {message}
            </p>
          ))}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="text-sm leading-none flex-shrink-0 opacity-60 hover:opacity-100"
          style={{ color: 'var(--risk-high)' }}
        >
          x
        </button>
      </div>
    );
  }

  if (grade === 'minimal') {
    return (
      <div className="flex items-start gap-3 border rounded-lg px-4 py-3" style={bannerStyle}>
        <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-high)' }}>⚠</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--risk-high)' }}>
            Very limited identity data
          </p>
          <p className="text-sm" style={{ color: 'var(--risk-high)' }}>
            Only required fields were present in this upload. Email and address
            patterns were checked but stronger identity matching was not
            possible.
          </p>
          {warningMessages.map((message) => (
            <p key={message} className="text-sm" style={{ color: 'var(--risk-high)' }}>
              {message}
            </p>
          ))}
          <Link
            href="/help/csv-export"
            className="text-xs underline"
            style={{ color: 'var(--risk-high)' }}
          >
            Improve future audits →
          </Link>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="text-sm leading-none flex-shrink-0 opacity-60 hover:opacity-100"
          style={{ color: 'var(--risk-high)' }}
        >
          ✕
        </button>
      </div>
    );
  }

  // sparse
  return (
    <div className="flex items-start gap-3 border rounded-lg px-4 py-3" style={bannerStyle}>
      <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--risk-high)' }}>⚠</span>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Limited identity data in this audit
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Matching relied mostly on softer identity signals, so some results
          may stay at &lsquo;possible&rsquo; instead of reaching higher confidence.
          Adding stronger identity fields would improve linking confidence.
        </p>
        {warningMessages.map((message) => (
          <p key={message} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        ))}
        <Link
          href="/help/csv-export"
          className="text-xs underline"
          style={{ color: 'var(--text-muted)' }}
        >
          See which fields to add →
        </Link>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="text-sm leading-none flex-shrink-0"
        style={{ color: 'var(--risk-high)' }}
      >
        ✕
      </button>
    </div>
  );
}
