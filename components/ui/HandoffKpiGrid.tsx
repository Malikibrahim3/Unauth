import type { ReactNode } from 'react';

export type HandoffKpi = {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  tone?: 'default' | 'blue' | 'amber' | 'green' | 'red';
};

export function HandoffKpiGrid({ items, label = 'Page summary' }: { items: HandoffKpi[]; label?: string }) {
  return (
    <section className="ua-handoff-kpis" aria-label={label}>
      {items.map((item) => (
        <div className="ua-handoff-kpi" data-tone={item.tone ?? 'default'} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </section>
  );
}
