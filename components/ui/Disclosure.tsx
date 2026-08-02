'use client';

import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn('flex w-full cursor-pointer items-center justify-between gap-2 text-left', summaryClassName)}
      >
        <span>{summary}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="shrink-0 transition-transform duration-[var(--ua-duration-fast)]"
          style={{ transform: open ? 'rotate(180deg)' : undefined, color: 'var(--ua-icon-secondary)' }}
        />
      </button>
      {open ? children : null}
    </div>
  );
}
