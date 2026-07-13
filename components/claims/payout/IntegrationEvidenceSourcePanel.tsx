'use client';

import type { EvidencePack } from '@/lib/integrations/types';
import { PanelCard } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

function labelSummary(summary: string) {
  if (summary.toLowerCase().includes('attempted') && summary.toLowerCase().includes('not available')) {
    return summary;
  }
  return summary;
}

export function IntegrationEvidenceSourcePanel({
  evidencePack,
}: {
  evidencePack: EvidencePack | null | undefined;
}) {
  if (!evidencePack) return null;
  const connected = evidencePack.connectedSources;
  if (connected.length === 0) return null;

  return (
    <PanelCard as="section" variant="app" className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Connected evidence sources
        </p>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {connected.length} source{connected.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-2">
        {connected.map((source) => {
          const attemptedUnavailable = evidencePack.missingEvidence.filter(
            (item) => item.providerId === source.providerId && item.reason === 'attempted_unavailable',
          );
          const summaries = [
            ...source.summaries,
            ...attemptedUnavailable.map((item) => item.message),
          ];
          return (
            <PanelCard key={source.providerId} as="li" variant="appInset" className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{source.providerName}</span>
                <StatusBadge family="workflowStatus" value="connected" size="sm" />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {summaries.length > 0 ? summaries.map(labelSummary).join(' · ') : 'Connected, no matching evidence found for this case yet'}
              </p>
            </PanelCard>
          );
        })}
      </ul>
    </PanelCard>
  );
}
