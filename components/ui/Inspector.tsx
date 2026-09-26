import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InspectorProps {
  /** 360px / 440px, bounded inside the scroll container. */
  width?: 'standard' | 'wide';
  header: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  /** Header stays put on scroll; must not be overlapped by a sibling sticky header. */
  sticky?: boolean;
  className?: string;
}

/** Persistent workbench/detail context rail; use Drawer for transient overlay context. */
export function Inspector({
  width = 'standard',
  header,
  children,
  actions,
  onClose,
  sticky = true,
  className,
}: InspectorProps) {
  return (
    <aside className={cn('rounded-xl border border-[#e4e3e0] bg-white shadow-xl', `${width}`, className)}>
      <header className={cn('flex items-center gap-3', sticky && 'flex items-center gap-3')}>
        <div className="flex items-center gap-3">{header}</div>
        <div className="flex items-center gap-3">
          {actions}
          {onClose ? (
            <button type="button" className="inline-flex items-center justify-center rounded-lg border border-[#d8d4cf] bg-white p-2 text-[#40454a]" onClick={onClose} aria-label="Close">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </aside>
  );
}
