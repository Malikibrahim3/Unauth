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
      className={cn('ua-board-surface', className)}
      aria-label={label}
    >
      <div className="ua-board">{children}</div>
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
    <section className={cn('ua-board__column', className)}>
      <header className="ua-board__column-header">
        <h2 className="ua-board__column-title">{title}</h2>
        {count != null ? <span className="ua-board__count">{count}</span> : null}
      </header>
      <div className="ua-board__column-body">{children}</div>
    </section>
  );
}
