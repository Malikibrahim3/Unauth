import { Check, Circle } from 'lucide-react';
import { type ReactNode } from 'react';

export function EvidenceChecklist({ items }: { items: Array<{ label: ReactNode; complete?: boolean }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-[#eae8e5] rounded-[8px] border border-[#eae8e5] bg-[#fff]">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 px-3 py-2 text-xs text-[#64686d]">
          {item.complete ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1a6b43]" aria-hidden="true" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6f6a63]" aria-hidden="true" />}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
