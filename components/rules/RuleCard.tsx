'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import type { MerchantRule } from '@/lib/rules-engine';
import { ACTION_LABELS, ACTION_TONES, summarizeConditions } from '@/lib/rules/summary';

interface RuleCardProps {
  rule: MerchantRule;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onToggleActive: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

export function RuleCard({
  rule,
  canManage,
  isFirst,
  isLast,
  busy,
  onToggleActive,
  onEdit,
  onDelete,
  onMove,
}: RuleCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summary = summarizeConditions(rule.conditions, rule.condition_operator);

  return (
    <Card variant="raised" density="compact">
      <div className="flex items-start gap-3">
        {/* Priority handle */}
        {canManage && (
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Move up"
              disabled={isFirst || busy}
              onClick={() => onMove('up')}
              className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={isLast || busy}
              onClick={() => onMove('down')}
              className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
              {rule.name}
            </h3>
            <Badge tone={ACTION_TONES[rule.action]} variant="subtle" size="sm" dot>
              {ACTION_LABELS[rule.action]}
            </Badge>
            {!rule.is_active && (
              <Badge tone="neutral" variant="subtle" size="sm">Disabled</Badge>
            )}
          </div>

          {rule.description && (
            <p className="mt-0.5 truncate text-caption" style={{ color: 'var(--text-secondary)' }}>
              {rule.description}
            </p>
          )}

          <p
            className="mt-2 text-body-sm"
            style={{
              color: 'var(--text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>If </span>
            {summary}
          </p>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <ActiveToggle active={rule.is_active} disabled={busy} onChange={onToggleActive} />
            <button
              type="button"
              aria-label="Edit rule"
              onClick={onEdit}
              disabled={busy}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete rule"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--risk-high)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] p-3"
          style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-muted)' }}
        >
          <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
            Delete <strong>{rule.name}</strong>? This can't be undone.
          </span>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ActiveToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Disable rule' : 'Enable rule'}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
      style={{ background: active ? 'var(--accent)' : 'var(--border)' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{ transform: active ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}
