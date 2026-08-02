'use client';

import type { EvidencePack } from '@/lib/integrations/types';
import { Card } from '@/components/ui';
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
    <Card unstyled as="section" variant="panel" className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>
          Connected evidence sources
        </p>
        <span className="ua-text-metadata">
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
            <Card unstyled key={source.providerId} as="li" variant="muted" className="ua-text-dense p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{source.providerName}</span>
                <StatusBadge family="workflowStatus" value="connected" size="sm" />
              </div>
              <p className="ua-text-caption-role mt-1">
                {summaries.length > 0 ? summaries.map(labelSummary).join(' · ') : 'Connected, no matching evidence found for this case yet'}
              </p>
            </Card>
          );
        })}
      </ul>
    </Card>
  );
}
