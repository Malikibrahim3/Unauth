import Link from '@/components/navigation/AppNavLink';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FinancialEquationItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  operator?: 'minus' | 'plus' | 'equals';
  href?: string;
  state?: 'known' | 'partial' | 'unavailable';
};

const OPERATOR: Record<NonNullable<FinancialEquationItem['operator']>, string> = {
  minus: '−',
  plus: '+',
  equals: '=',
};

export function FinancialEquation({
  items,
  label,
  conclusion,
  className,
}: {
  items: FinancialEquationItem[];
  label: string;
  conclusion?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('ua-financial-equation', className)} aria-label={label}>
      <div className="ua-financial-equation__viewport">
        <ol className="ua-financial-equation__items">
          {items.map((item) => {
            const linked = (
              <>
                <span className="ua-financial-equation__label">{item.label}</span>
                <strong className="ua-financial-equation__value">{item.value}</strong>
              </>
            );
            return (
              <li
                key={item.key}
                className="ua-financial-equation__item"
                data-state={item.state ?? 'known'}
              >
                {item.operator ? (
                  <span className="ua-financial-equation__operator" aria-hidden="true">
                    {OPERATOR[item.operator]}
                  </span>
                ) : null}
                <span className="ua-financial-equation__body">
                  {item.href ? (
                    <Link className="ua-financial-equation__link" href={item.href}>
                      {linked}
                    </Link>
                  ) : (
                    linked
                  )}
                  {item.detail ? (
                    <span className="ua-financial-equation__detail">{item.detail}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {conclusion ? (
        <p className="ua-financial-equation__conclusion">{conclusion}</p>
      ) : null}
    </section>
  );
}
