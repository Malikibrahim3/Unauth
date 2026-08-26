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
  'data-state-id'?: string;
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
  'data-state-id': dataStateId,
}: AuthenticatedPanelProps) {
  // Renders the canonical working surface (§7.1) via the shared Surface
  // primitive; `styles.panel`/`.panelHeader`/`.panelBody` compose the shared
  // `ua-working-surface` anatomy from global rather than redeclaring it.
  return (
    <Surface as="section" structure="working" className={cn(styles.panel, className)} data-capability-id={capabilityId} data-state-id={dataStateId}>
      {title || description || actions ? (
        <div className={styles.panelHeader}>
          <div>
            {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
            {description ? <p className={styles.panelDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(styles.panelBody, bodyClassName)}>{children}</div>
    </Surface>
  );
}
