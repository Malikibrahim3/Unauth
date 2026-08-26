import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BeforeYouConfirmProps {
  objectSummary: ReactNode;
  valueSummary: ReactNode;
  externalAction: ReactNode;
  reversible: ReactNode;
  appendOnly: ReactNode;
  children?: ReactNode;
  className?: string;
}

const rows = ['objectSummary', 'valueSummary', 'externalAction', 'reversible', 'appendOnly'] as const;
type BeforeYouConfirmRow = (typeof rows)[number];

const labels: Record<BeforeYouConfirmRow, string> = {
  objectSummary: 'Object',
  valueSummary: 'Value',
  externalAction: 'External action',
  reversible: 'Reversible',
  appendOnly: 'Appends',
};

/** Shared consequence review block for irreversible or externally visible actions. */
export function BeforeYouConfirm({
  objectSummary,
  valueSummary,
  externalAction,
  reversible,
  appendOnly,
  children,
  className,
}: BeforeYouConfirmProps) {
  const values: Record<BeforeYouConfirmRow, ReactNode> = {
    objectSummary,
    valueSummary,
    externalAction,
    reversible,
    appendOnly,
  };

  return (
    <aside className={cn('ua-before-confirm', className)} aria-label="Before you confirm">
      <div className="ua-before-confirm__heading">
        <h3>Before you confirm</h3>
      </div>
      <dl className="ua-before-confirm__rows">
        {rows.map((row) => (
          <div className="ua-before-confirm__row" key={row}>
            <dt>{labels[row]}</dt>
            <dd>{values[row]}</dd>
          </div>
        ))}
      </dl>
      {children ? <div className="ua-before-confirm__note">{children}</div> : null}
    </aside>
  );
}
