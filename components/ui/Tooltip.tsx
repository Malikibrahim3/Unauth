'use client';

import { cloneElement, type ReactElement, type ReactNode, useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { DURATION } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import { OverlayPortal } from '@/components/ui/OverlayPortal';

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
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const { mounted, phase, motionAllowed } = useOverlayPresence({
    open: visible,
    exitDurationMs: DURATION.fast,
    transient: true,
  });

  const trigger = (() => {
    const child = children as ReactElement<{ 'aria-describedby'?: string; className?: string }>;
    if (!child || typeof child !== 'object' || !('props' in child)) return children;
    return cloneElement(child, {
      'aria-describedby': [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' '),
      className: cn('ua-tooltip-trigger', child.props.className),
    });
  })();

  const isOpen = phase === 'open';
  const duration = DURATION.fast;

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ left: rect.left + rect.width / 2, top: rect.top - 6 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [mounted]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex min-h-6 min-w-6"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {mounted && (
        <OverlayPortal>
        <span
          id={tooltipId}
          role="tooltip"
          aria-hidden={phase === 'exiting' ? true : undefined}
          className={cn(
            'pointer-events-none fixed z-[var(--ua-z-tooltip)] max-w-[280px]',
            'rounded-[var(--ua-radius-xs)] bg-[var(--ua-text-primary)] px-[var(--ua-space-2)] py-[var(--ua-space-1)] text-meta text-[var(--ua-text-inverse)]',
            'whitespace-normal shadow-[var(--ua-shadow-float)]',
            className,
          )}
          style={{
            left: position.left,
            top: position.top,
            opacity: isOpen ? 1 : 0,
            transform: `translate(-50%, calc(-100% + ${isOpen ? 0 : 2}px))`,
            transition: motionAllowed ? `opacity ${duration}ms var(--ua-ease-standard), transform ${duration}ms var(--ua-ease-standard)` : 'none',
          }}
        >
          {content}
        </span>
        </OverlayPortal>
      )}
    </span>
  );
}
