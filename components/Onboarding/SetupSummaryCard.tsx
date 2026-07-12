'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PanelCard, StatusBadge } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { calculateAutomationReadiness } from '@/lib/automation/readiness';
import type { IntegrationCategory, ProviderConnectionView } from '@/lib/integrations/types';

type IntegrationsBody = { providers?: ProviderConnectionView[] };
type RulesBody = { rules?: Array<{ active?: boolean; is_active?: boolean }> };
type MetricsBody = { metrics?: { automaticOutcomes: number; probableOutcomes: number; unknownOutcomes: number; unresolvedExceptions: number; recoveryTasks: number } };

export default function SetupSummaryCard() {
  const { data } = useFetchJson<IntegrationsBody>('/api/integrations');
  const { data: rules } = useFetchJson<RulesBody>('/api/rules');
  const { data: metricsBody } = useFetchJson<MetricsBody>('/api/automation/metrics');
  const providers = (data?.providers ?? []).filter((p) => p.buildStatus !== 'slot_only');
  if (!data) return null;
  const signal = (categories: IntegrationCategory[]) => {
    const source = providers.find((p) => categories.includes(p.category) && ['connected', 'syncing'].includes(p.status)) ?? providers.find((p) => categories.includes(p.category));
    return { connected: Boolean(source && ['connected', 'syncing'].includes(source.status)), syncState: source?.syncState };
  };
  const metrics = metricsBody?.metrics;
  const result = calculateAutomationReadiness({ commerce: signal(['commerce']), helpdesk: signal(['helpdesk']), tracking: signal(['tracking', 'carrier']), payments: signal(['payments_disputes']), warehouse: signal(['warehouse_3pl']), activeRules: (rules?.rules ?? []).filter((r) => r.is_active ?? r.active ?? true).length, unresolvedExceptions: metrics?.unresolvedExceptions ?? 0, financialExceptions: metrics?.unknownOutcomes ?? 0, recoveryTasks: metrics?.recoveryTasks ?? 0, activityCount: metrics ? metrics.automaticOutcomes + metrics.probableOutcomes + metrics.unknownOutcomes : 0 });
  const connected = providers.filter((p) => ['connected', 'syncing'].includes(p.status)).length;

  return <PanelCard as="section" variant="app" className="p-4 md:p-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{result.earlyStage ? 'Automation setup' : 'Automation readiness'}</p>{!result.earlyStage ? <StatusBadge variant={result.score >= 75 ? 'cleared' : 'held'}>{result.band}</StatusBadge> : null}</div><div className="mt-2 flex items-baseline gap-3"><p className="text-2xl font-semibold tabular-nums">{result.earlyStage ? `${result.readyAreas} of 4` : `${result.score}%`}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result.earlyStage ? 'core areas ready' : `Data quality: ${result.dataQuality}`}</p></div><div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken)' }}><div className="h-full rounded-full" style={{ width: `${result.score}%`, background: 'var(--accent)' }} /></div></div>
      <div className="md:max-w-sm"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Next best action</p>{result.recommendation ? <Link href={result.recommendation.href} className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--accent)' }}>{result.recommendation.label}<ArrowRight className="h-3.5 w-3.5" /></Link> : <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />Core automation is ready</p>}<p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{connected} source{connected === 1 ? '' : 's'} connected · {result.workload}</p></div>
    </div>
  </PanelCard>;
}
