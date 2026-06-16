'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui';

interface RulesEmptyStateProps {
  canManage: boolean;
  onCreate: () => void;
  onBrowseTemplates: () => void;
}

export function RulesEmptyState({ canManage, onCreate, onBrowseTemplates }: RulesEmptyStateProps) {
  return (
    <EmptyState
      icon={<SlidersHorizontal className="h-6 w-6" />}
      title="No fraud rules yet"
      description="Rules apply your own logic to Unauth's identity signals and surface a recommendation in the Gorgias widget. Unauth runs the math — you own the decision."
      action={
        canManage ? (
          <div className="flex items-center justify-center gap-2">
            <Button variant="primary" onClick={onCreate}>
              Create your first rule
            </Button>
            <Button variant="secondary" onClick={onBrowseTemplates}>
              Use a template
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
