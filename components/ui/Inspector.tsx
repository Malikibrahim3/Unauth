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
    <aside className={cn('ua-inspector', `ua-inspector--${width}`, className)}>
      <header className={cn('ua-inspector__header', sticky && 'ua-inspector__header--sticky')}>
        <div className="ua-inspector__header-content">{header}</div>
        <div className="ua-inspector__header-actions">
          {actions}
          {onClose ? (
            <button type="button" className="ua-icon-button ua-icon-button--sm" onClick={onClose} aria-label="Close">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>
      <div className="ua-inspector__body">{children}</div>
    </aside>
  );
}
