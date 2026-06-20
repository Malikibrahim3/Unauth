'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui';
import { DEFAULT_PAYOUT_RULES } from '@/lib/rules/payoutDefaults';
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
      title="No payout rules yet"
      description="Default payout rules are active until you create your own."
      action={
        canManage ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {DEFAULT_PAYOUT_RULES.map((rule) => (
                <span
                  key={rule.name}
                  className="rounded-[var(--radius-md)] border px-2.5 py-1 text-caption"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  {rule.name}: {ACTION_LABELS[rule.action]}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
            <Button variant="primary" onClick={onUseDefaults}>
              Use default payout rules
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
