import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/ui/Surface';
import styles from './AuthenticatedPageChrome.module.css';

type AuthenticatedPanelProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  capabilityId?: string;
};

/** Dense white content panel used by list, form, and configuration surfaces. */
export function AuthenticatedPanel({
  children,
  title,
  description,
  actions,
  className,
  bodyClassName,
  capabilityId,
}: AuthenticatedPanelProps) {
  // Renders the canonical working surface (§8.2) via the shared Surface
  // primitive; `styles.panel` keeps the panel's overflow clipping.
  return (
    <Surface as="section" structure="working" className={cn(styles.panel, className)} data-capability-id={capabilityId}>
      {title || description || actions ? (
        <div className={cn(styles.panelHeader, 'ua-working-surface__header')}>
          <div>
            {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
            {description ? <p className={styles.panelDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(styles.panelBody, 'ua-working-surface__body', bodyClassName)}>{children}</div>
    </Surface>
  );
}
