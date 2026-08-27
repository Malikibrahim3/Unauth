import { Check, Circle } from 'lucide-react';
import { type ReactNode } from 'react';

export function EvidenceChecklist({ items }: { items: Array<{ label: ReactNode; complete?: boolean }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-[var(--uo-route-border-subtle)] rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-primary)]">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 px-3 py-2 text-xs text-[var(--uo-route-text-secondary)]">
          {item.complete ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--uo-route-success)]" aria-hidden="true" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--uo-route-text-tertiary)]" aria-hidden="true" />}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
