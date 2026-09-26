import type { ReactNode } from 'react';

export type HandoffKpi = {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  tone?: 'default' | 'blue' | 'amber' | 'green' | 'red';
};

export function HandoffKpiGrid({ items, label = 'Page summary' }: { items: HandoffKpi[]; label?: string }) {
  return (
    <section className="mb-4 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-[#e4e3e0] bg-[#e4e3e0]" aria-label={label}>
      {items.map((item) => (
        <div className="min-w-0 bg-white px-4 py-3.5" data-tone={item.tone ?? 'default'} key={item.label}>
          <span className="block text-[10.5px] font-normal text-[#64686d]">{item.label}</span>
          <strong className="mt-1.5 block font-mono text-[18px] font-normal leading-none tabular-nums text-[#1c1f23] data-[tone=blue]:text-[#315e8a] data-[tone=amber]:text-[#9a6414] data-[tone=green]:text-[#1a6b43] data-[tone=red]:text-[#b0431a]">{item.value}</strong>
          <small className="mt-1 block text-[9.5px] font-normal leading-[1.4] text-[#6f6a63]">{item.detail}</small>
        </div>
      ))}
    </section>
  );
}
