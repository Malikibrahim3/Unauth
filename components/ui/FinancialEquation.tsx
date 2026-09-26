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
    <section className={cn('overflow-hidden rounded-xl border border-[#e4e3e0] bg-white', className)} aria-label={label}>
      <div className="overflow-x-auto p-4">
        <ol className="flex min-w-max items-stretch gap-2">
          {items.map((item) => {
            const linked = (
              <>
                <span className="text-[11px] leading-[1.45] text-[#64686d]">{item.label}</span>
                <strong className="font-semibold tabular-nums text-[#1c1f23]">{item.value}</strong>
              </>
            );
            return (
              <li
                key={item.key}
                className="relative flex min-w-40 items-center rounded-lg bg-[#f4f3f1] p-3"
                data-state={item.state ?? 'known'}
              >
                {item.operator ? (
                  <span className="mr-3 font-mono text-[18px] text-[#6f6a63]" aria-hidden="true">
                    {OPERATOR[item.operator]}
                  </span>
                ) : null}
                <span className="flex flex-col gap-3">
                  {item.href ? (
                    <Link className="text-[#9f4f08] no-underline" href={item.href}>
                      {linked}
                    </Link>
                  ) : (
                    linked
                  )}
                  {item.detail ? (
                    <span className="text-[11px] leading-[1.45] text-[#64686d]">{item.detail}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {conclusion ? (
        <p className="m-0 border-t border-[#e4e3e0] bg-[#ffffff] px-4 py-3 text-[11px] text-[#64686d]">{conclusion}</p>
      ) : null}
    </section>
  );
}
