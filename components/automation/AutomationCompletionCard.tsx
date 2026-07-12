'use client';

import { useEffect, useState } from 'react';
import type { AutomationMetrics } from '@/lib/reconciliation/metrics';

export function AutomationCompletionCard() {
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  useEffect(() => { fetch('/api/automation/metrics').then((response) => response.json()).then((body) => setMetrics(body.metrics ?? null)).catch(() => setMetrics(null)); }, []);
  if (!metrics) return null;
  return <section className="rounded-lg border bg-white p-4"><h2 className="text-sm font-semibold">Automation completion</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>How much routine case work completed from connected-source facts without merchant input.</p><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div><p className="text-xl font-semibold">{metrics.automationCompletionPercent}%</p><p className="text-xs">Automatic outcomes</p></div><div><p className="text-xl font-semibold">{metrics.probableOutcomes}</p><p className="text-xs">Probable, need confirmation</p></div><div><p className="text-xl font-semibold">{metrics.unknownOutcomes}</p><p className="text-xs">Unknown outcomes</p></div><div><p className="text-xl font-semibold">{metrics.unresolvedExceptions}</p><p className="text-xs">Unresolved exceptions</p></div></div><p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>Average merchant inputs/case: {metrics.averageMerchantInputsPerCase} · Reconciliation lag: {metrics.reconciliationLagHours == null ? 'No exceptions yet' : `${metrics.reconciliationLagHours}h`}</p></section>;
}
