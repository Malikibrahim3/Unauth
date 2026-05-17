'use client';

/**
 * DisputeReadinessPanel
 * Read-only checklist showing dispute readiness status based on an evidence_packages row.
 * Each check uses a traffic-light Badge tone (success / warning / critical).
 *
 * DO NOT modify narrative text, CE3 eligibility logic, or PDF generator route.
 */

import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { Info } from 'lucide-react';

export interface EvidencePackageRow {
  ce3_eligible: boolean;
  ce3_qualifying_signals: string[] | null;
  ce3_prior_transactions: unknown[] | null;
  narrative_summary: string | null;
  signal_snapshot: unknown[] | null;
  merchant_notes: string | null;
}

interface CheckItem {
  label: string;
  passed: boolean | 'warning';
  detail?: string;
}

interface DisputeReadinessPanelProps {
  pkg: EvidencePackageRow;
  /** Minimum identity signals required for readiness (default: 2) */
  minSignals?: number;
  /** Minimum prior transactions required for CE3.0 (default: 2) */
  minPriorTransactions?: number;
}

function readinessTone(passed: boolean | 'warning'): BadgeTone {
  if (passed === true) return 'success';
  if (passed === 'warning') return 'warning';
  return 'critical';
}

function readinessMarker(passed: boolean | 'warning') {
  if (passed === true) return { symbol: '●', color: '#1A1814' };
  if (passed === 'warning') return { symbol: '◐', color: '#7A4F1C' };
  return { symbol: '○', color: '#7B2D26' };
}

export function DisputeReadinessPanel({
  pkg,
  minSignals = 2,
  minPriorTransactions = 2,
}: DisputeReadinessPanelProps) {
  const signalCount = pkg.signal_snapshot?.length ?? 0;
  const priorCount = pkg.ce3_prior_transactions?.length ?? 0;

  const checks: CheckItem[] = [
    {
      label: 'CE3.0 eligible',
      passed: pkg.ce3_eligible ? true : false,
      detail: pkg.ce3_eligible
        ? 'Package qualifies for Visa Compelling Evidence 3.0'
        : 'Package does not meet CE3.0 criteria',
    },
    {
      label: 'Narrative summary present',
      passed: !!pkg.narrative_summary,
      detail: pkg.narrative_summary
        ? 'Dispute narrative generated'
        : 'No narrative summary found — regenerate the package',
    },
    {
      label: `Identity signals ≥ ${minSignals}`,
      passed:
        signalCount >= minSignals ? true : signalCount > 0 ? 'warning' : false,
      detail:
        signalCount === 0
          ? 'No identity signals recorded'
          : `${signalCount} signal${signalCount !== 1 ? 's' : ''} captured`,
    },
    {
      label: `Prior transactions ≥ ${minPriorTransactions}`,
      passed:
        priorCount >= minPriorTransactions ? true : priorCount > 0 ? 'warning' : false,
      detail:
        priorCount === 0
          ? 'No qualifying prior transactions'
          : `${priorCount} prior transaction${priorCount !== 1 ? 's' : ''} on record`,
    },
    {
      label: 'Merchant notes present',
      passed: !!pkg.merchant_notes ? true : 'warning',
      detail: pkg.merchant_notes
        ? 'Merchant notes attached'
        : 'No merchant notes — consider adding context before submitting',
    },
  ];

  const passedCount = checks.filter((c) => c.passed === true).length;
  const allPassed = passedCount === checks.length;

  return (
    <div
      className="border p-5 space-y-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 4 }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-overline"><span style={{ color: '#7B2D26' }}>§ </span>Readiness</h2>
        <Badge tone={allPassed ? 'success' : passedCount >= 3 ? 'warning' : 'critical'} variant="subtle" size="sm">
          {passedCount}/{checks.length} checks passed
        </Badge>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-start gap-3 px-3 py-2.5"
            style={{
              background:
                check.passed === true
                  ? 'var(--risk-low-bg)'
                  : check.passed === 'warning'
                  ? 'var(--risk-medium-bg)'
                  : 'var(--risk-critical-bg)',
              border: `1px solid ${
                check.passed === true
                  ? 'var(--risk-low-line)'
                  : check.passed === 'warning'
                  ? 'var(--risk-medium-line)'
                  : 'var(--risk-critical-line)'
              }`,
              borderRadius: 4,
            }}
          >
            <span className="mt-0.5 text-sm leading-none shrink-0" style={{ color: readinessMarker(check.passed).color }}>
              {readinessMarker(check.passed).symbol}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                  {check.label}
                </p>
                <Badge tone={readinessTone(check.passed)} variant="subtle" size="sm">
                  {check.passed === true ? 'Pass' : check.passed === 'warning' ? 'Caution' : 'Fail'}
                </Badge>
              </div>
              {check.detail && (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {check.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Read-only checklist. To update signals or narrative, re-generate the evidence package.
          CE3.0 eligibility is determined automatically and cannot be overridden here.
        </p>
      </div>
    </div>
  );
}
