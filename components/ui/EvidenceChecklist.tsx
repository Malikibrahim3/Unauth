import { Check, Circle } from 'lucide-react';
import { type ReactNode } from 'react';

export function EvidenceChecklist({ items }: { items: Array<{ label: ReactNode; complete?: boolean }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-[var(--ua-border-subtle)] rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 px-3 py-2 text-xs text-[var(--ua-text-secondary)]">
          {item.complete ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ua-success)]" aria-hidden="true" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
