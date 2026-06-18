'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui';
import { DEFAULT_RISK_CONTROLS } from '@/lib/rules/riskBands';
import { ACTION_LABELS } from '@/lib/rules/summary';

interface RulesEmptyStateProps {
  canManage: boolean;
  onUseDefaults: () => void;
  onBrowseTemplates: () => void;
}

export function RulesEmptyState({ canManage, onUseDefaults, onBrowseTemplates }: RulesEmptyStateProps) {
  return (
    <EmptyState
      icon={<SlidersHorizontal className="h-6 w-6" />}
      title="No risk controls yet"
      description="Default score bands are active until you create your own controls."
      action={
        canManage ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {DEFAULT_RISK_CONTROLS.map((control) => (
                <span
                  key={control.name}
                  className="rounded-[var(--radius-md)] border px-2.5 py-1 text-caption"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  {control.lower}-{control.upper}: {ACTION_LABELS[control.action]}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
            <Button variant="primary" onClick={onUseDefaults}>
              Use default policy
            </Button>
            <Button variant="secondary" onClick={onBrowseTemplates}>
              Use a template
            </Button>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
