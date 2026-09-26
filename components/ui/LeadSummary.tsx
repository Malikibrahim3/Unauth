import type { ReactNode } from 'react';

export type LeadSummaryItem = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
};

export type LeadSummaryProps = {
  lead: LeadSummaryItem;
  supporting: LeadSummaryItem[];
  'aria-label'?: string;
};

/**
 * A hierarchical summary for analytical and financial routes.
 *
 * One value owns the story; the remaining facts are deliberately quieter.
 * This replaces equal-weight KPI slabs where a page has a genuine lead fact.
 */
export function LeadSummary({
  lead,
  supporting,
  'aria-label': ariaLabel = 'Summary',
}: LeadSummaryProps) {
  return (
    <section className="grid overflow-hidden rounded-xl border border-[#e4e3e0] bg-white md:grid-cols-[minmax(220px,.8fr)_minmax(0,1.8fr)]" aria-label={ariaLabel}>
      <dl className="m-0 bg-[#f4f3f1] p-5">
        <dt className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#64686d]">{lead.label}</dt>
        <dd className="mt-2 font-mono text-[24px] text-[#1c1f23]">{lead.value}</dd>
        {lead.description ? <dd className="text-[11px] leading-[1.45] text-[#64686d]">{lead.description}</dd> : null}
      </dl>
      <div className="grid grid-cols-2 divide-x divide-y divide-[#e4e3e0] lg:grid-cols-4">
        {supporting.map((item) => (
          <dl className="m-0 min-w-0 p-4" key={item.label}>
            <dt className="text-[9.5px] font-semibold uppercase tracking-[.07em] text-[#6f6a63]">{item.label}</dt>
            <dd className="mt-2 font-mono text-[16px] text-[#1c1f23]">{item.value}</dd>
            {item.description ? <dd className="text-[11px] leading-[1.45] text-[#64686d]">{item.description}</dd> : null}
          </dl>
        ))}
      </div>
    </section>
  );
}
