'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutTemplate, Plus } from 'lucide-react';
import { Button, PageHeader } from '@/components/ui';
import type { MerchantRule } from '@/lib/rules-engine';
import { RuleCard } from './RuleCard';
import { RuleBuilderDrawer, type RuleDraftPayload } from './RuleBuilderDrawer';
import { RuleTemplatesDrawer, type RuleTemplate } from './RuleTemplatesDrawer';
import { RulesEmptyState } from './RulesEmptyState';

type Toast = { message: string; type: 'success' | 'error' };

interface RulesPageClientProps {
  canManage: boolean;
}

export function RulesPageClient({ canManage }: RulesPageClientProps) {
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MerchantRule | null>(null);

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [activatingTemplateId, setActivatingTemplateId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      if (res.ok) setRules(data.rules ?? []);
      else showToast(data.error ?? 'Failed to load rules', 'error');
    } catch {
      showToast('Failed to load rules', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial load. All state updates happen after `await`, so nothing is set
  // synchronously inside the effect body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/rules');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setRules(data.rules ?? []);
        else showToast(data.error ?? 'Failed to load rules', 'error');
      } catch {
        if (!cancelled) showToast('Failed to load rules', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const openCreate = () => {
    setEditingRule(null);
    setBuilderOpen(true);
  };

  const openEdit = (rule: MerchantRule) => {
    setEditingRule(rule);
    setBuilderOpen(true);
  };

  const handleSubmit = async (payload: RuleDraftPayload, id?: string): Promise<boolean> => {
    try {
      const res = await fetch(id ? `/api/rules/${id}` : '/api/rules', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Failed to save rule', 'error');
        return false;
      }
      showToast(id ? 'Rule updated' : 'Rule created');
      await loadRules();
      return true;
    } catch {
      showToast('Failed to save rule', 'error');
      return false;
    }
  };

  const handleToggleActive = async (rule: MerchantRule, next: boolean) => {
    setBusyId(rule.id);
    // optimistic
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: next } : r)));
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !next } : r)));
        showToast('Failed to update rule', 'error');
      }
    } catch {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !next } : r)));
      showToast('Failed to update rule', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rule: MerchantRule) => {
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
        showToast('Rule deleted');
      } else {
        showToast('Failed to delete rule', 'error');
      }
    } catch {
      showToast('Failed to delete rule', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (rule: MerchantRule, direction: 'up' | 'down') => {
    const index = rules.findIndex((r) => r.id === rule.id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rules.length) return;

    const reordered = [...rules];
    const tmp = reordered[index]!;
    reordered[index] = reordered[swapWith]!;
    reordered[swapWith] = tmp;
    // Reassign sequential priorities and apply optimistically.
    const withPriority = reordered.map((r, i) => ({ ...r, priority: i }));
    setRules(withPriority);
    setBusyId(rule.id);
    try {
      const res = await fetch('/api/rules/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: withPriority.map((r) => ({ id: r.id, priority: r.priority })) }),
      });
      if (!res.ok) {
        await loadRules();
        showToast('Failed to reorder rules', 'error');
      }
    } catch {
      await loadRules();
      showToast('Failed to reorder rules', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openTemplates = async () => {
    setTemplatesOpen(true);
    if (templates.length === 0) {
      setTemplatesLoading(true);
      try {
        const res = await fetch('/api/rules/templates');
        const data = await res.json();
        if (res.ok) setTemplates(data.templates ?? []);
      } catch {
        showToast('Failed to load templates', 'error');
      } finally {
        setTemplatesLoading(false);
      }
    }
  };

  const handleActivateTemplate = async (template: RuleTemplate) => {
    setActivatingTemplateId(template.id);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          conditions: template.conditions,
          action: template.action,
          condition_operator: template.condition_operator,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Failed to add template', 'error');
        return;
      }
      showToast(`Added "${template.name}"`);
      await loadRules();
      setTemplatesOpen(false);
    } catch {
      showToast('Failed to add template', 'error');
    } finally {
      setActivatingTemplateId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fraud Rules"
        subtitle="Your rules applied to Unauth's signals. Unauth runs the math — you own the decision."
        primaryAction={
          canManage ? (
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New Rule
            </Button>
          ) : undefined
        }
        secondaryActions={
          canManage
            ? [
                <Button
                  key="templates"
                  variant="secondary"
                  leadingIcon={<LayoutTemplate className="h-4 w-4" />}
                  onClick={openTemplates}
                >
                  Browse Templates
                </Button>,
              ]
            : undefined
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-[var(--radius-lg)]"
              style={{ background: 'var(--surface-sunken)' }}
            />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <RulesEmptyState canManage={canManage} onCreate={openCreate} onBrowseTemplates={openTemplates} />
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              canManage={canManage}
              isFirst={index === 0}
              isLast={index === rules.length - 1}
              busy={busyId === rule.id}
              onToggleActive={(next) => handleToggleActive(rule, next)}
              onEdit={() => openEdit(rule)}
              onDelete={() => handleDelete(rule)}
              onMove={(direction) => handleMove(rule, direction)}
            />
          ))}
        </div>
      )}

      <RuleBuilderDrawer
        key={`${editingRule?.id ?? 'new'}-${builderOpen}`}
        open={builderOpen}
        mode={editingRule ? 'edit' : 'create'}
        initialRule={editingRule}
        onClose={() => setBuilderOpen(false)}
        onSubmit={handleSubmit}
      />

      <RuleTemplatesDrawer
        open={templatesOpen}
        templates={templates}
        loading={templatesLoading}
        activatingId={activatingTemplateId}
        onClose={() => setTemplatesOpen(false)}
        onActivate={handleActivateTemplate}
      />

      {toast && (
        <div
          className="fixed bottom-6 right-6 rounded-[var(--radius-md)] px-4 py-3 text-body-sm shadow-[var(--shadow-drawer)]"
          style={{
            zIndex: 'var(--z-toast, 60)' as unknown as number,
            background: 'var(--surface)',
            border: `1px solid ${toast.type === 'error' ? 'var(--risk-high)' : 'var(--accent)'}`,
            color: 'var(--text-primary)',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
