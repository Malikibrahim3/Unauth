import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Surface } from './Surface';

export function BoardSurface({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Surface
      structure="working"
      as="section"
      className={cn('rounded-xl border border-[#e4e3e0] bg-white', className)}
      aria-label={label}
    >
      <div className="grid gap-3 lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">{children}</div>
    </Surface>
  );
}

export function BoardColumn({
  title,
  count,
  children,
  className,
}: {
  title: ReactNode;
  count?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl bg-[#f4f3f1] p-3', className)}>
      <header className="mb-3 flex items-center gap-3">
        <h2 className="m-0 flex-1 text-[11px] font-semibold uppercase tracking-[.06em] text-[#40454a]">{title}</h2>
        {count != null ? <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-[#64686d]">{count}</span> : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
