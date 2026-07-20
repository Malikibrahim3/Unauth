import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
  return (
    <section className={cn(styles.panel, className)} data-capability-id={capabilityId}>
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
    </section>
  );
}
