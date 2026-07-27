'use client';

import { cloneElement, type ReactElement, type ReactNode, useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Tooltip({ content, children, delay = 300, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const trigger = (() => {
    const child = children as ReactElement<{ 'aria-describedby'?: string; className?: string }>;
    if (!child || typeof child !== 'object' || !('props' in child)) return children;
    return cloneElement(child, {
      'aria-describedby': [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' '),
      className: cn('ua-tooltip-trigger', child.props.className),
    });
  })();

  return (
    <span
      className="relative inline-flex min-h-6 min-w-6"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!visible}
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-[var(--ua-z-tooltip)] mb-1 max-w-[280px] -translate-x-1/2',
          'rounded-[var(--ua-radius-xs)] bg-[var(--ua-text-primary)] px-[var(--ua-space-2)] py-[var(--ua-space-1)] text-meta text-[var(--ua-text-inverse)]',
          'whitespace-normal shadow-[var(--ua-shadow-float)]',
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
