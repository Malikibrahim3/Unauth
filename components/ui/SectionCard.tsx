import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  density?: 'default' | 'compact';
  id?: string;
  className?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  density = 'default',
  id,
  className,
}: SectionCardProps) {
  const bodyPadding = density === 'compact' ? 'p-[var(--space-4)]' : 'p-[var(--space-5)]';

  return (
    <section
      id={id}
      className={cn(
        'rounded-[var(--radius-3)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-4)] px-[var(--space-5)] pt-[var(--space-5)] pb-[var(--space-3)]">
        <div>
          <h2 className="text-h2 text-[var(--text-primary)]">{title}</h2>
          {description && (
            <p className="mt-[var(--space-1)] text-small text-[var(--text-tertiary)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-[var(--space-2)] shrink-0">{actions}</div>}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-subtle)]" />

      {/* Body */}
      <div className={bodyPadding}>{children}</div>
    </section>
  );
}
