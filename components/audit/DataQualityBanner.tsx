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

  // Only show for sparse or minimal — rich/adequate need no banner
  if (dismissed || (grade !== 'sparse' && grade !== 'minimal')) return null;

  function dismiss() {
    localStorage.setItem(`unauth.dqBanner.${runId}`, 'dismissed');
    setDismissed(true);
  }

  const bannerStyle = {
    background: 'var(--risk-high-bg)',
    borderColor: 'var(--risk-high-bd)',
  };

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
          Results are marked &lsquo;possible&rsquo; — confidence could be
          higher with more identity fields in your export.
        </p>
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
