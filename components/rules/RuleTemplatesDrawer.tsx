'use client';

import { Plus } from 'lucide-react';
import { Button, Drawer, PanelCard, StatusBadge } from '@/components/ui';
import type { ConditionOperator, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { ACTION_LABELS, summarizeConditions } from '@/lib/rules/summary';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  action: RuleAction;
  condition_operator: ConditionOperator;
  sort_order: number;
}

interface RuleTemplatesDrawerProps {
  open: boolean;
  templates: RuleTemplate[];
  loading: boolean;
  activatingId: string | null;
  onClose: () => void;
  onActivate: (template: RuleTemplate) => void;
}

export function RuleTemplatesDrawer({
  open,
  templates,
  loading,
  activatingId,
  onClose,
  onActivate,
}: RuleTemplatesDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} width={560} title="Rule templates">
      <div className="flex flex-col gap-3 p-5">
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
          Start from a common pattern. Adding a template copies its conditions into your own rules —
          you can edit or remove it afterwards.
        </p>

        {loading && (
          <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Loading templates…</p>
        )}

        {!loading && templates.length === 0 && (
          <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>No templates available.</p>
        )}

        {templates.map((template) => (
          <PanelCard
            key={template.id}
            variant="appInset"
            className="p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {template.name}
                  </h3>
                  <StatusBadge variant={ruleActionVariant(template.action)}>
                    {ACTION_LABELS[template.action]}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-caption" style={{ color: 'var(--text-secondary)' }}>
                  {template.description}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Plus className="h-4 w-4" />}
                loading={activatingId === template.id}
                disabled={activatingId !== null}
                onClick={() => onActivate(template)}
              >
                Add
              </Button>
            </div>
            <p className="mt-3 text-body-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>If </span>
              {summarizeConditions(template.conditions, template.condition_operator)}
            </p>
          </PanelCard>
        ))}
      </div>
    </Drawer>
  );
}

function ruleActionVariant(action: RuleAction) {
  if (action === 'approve') return 'cleared';
  if (action === 'deny') return 'blocked';
  return 'flagged';
}
