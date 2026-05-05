'use client';

import { type ReactNode, useState, useRef, useEffect } from 'react';
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

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-[var(--z-tooltip)]',
            'bg-[var(--text-primary)] text-[var(--text-inverse)] text-meta',
            'px-[8px] py-[4px] rounded-[var(--radius-1)] whitespace-nowrap pointer-events-none',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
