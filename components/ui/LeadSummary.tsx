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
    <section className="ua-lead-summary" aria-label={ariaLabel}>
      <dl className="ua-lead-summary__lead">
        <dt>{lead.label}</dt>
        <dd>{lead.value}</dd>
        {lead.description ? <span>{lead.description}</span> : null}
      </dl>
      <div className="ua-lead-summary__support">
        {supporting.map((item) => (
          <dl key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            {item.description ? <span>{item.description}</span> : null}
          </dl>
        ))}
      </div>
    </section>
  );
}
