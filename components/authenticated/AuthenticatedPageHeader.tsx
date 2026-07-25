import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './AuthenticatedPageChrome.module.css';

export type Breadcrumb = { label: string; href?: string };

type AuthenticatedPageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  meta?: ReactNode;
  tabs?: ReactNode;
  capabilityId?: string;
};

/** Compact page chrome derived from the approved Overview composition. */
export function AuthenticatedPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  breadcrumbs,
  meta,
  tabs,
  capabilityId,
}: AuthenticatedPageHeaderProps) {
  return (
    <header className={styles.pageHeader} data-capability-id={capabilityId}>
      {breadcrumbs?.length ? (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <span key={item.href ?? item.label}>
              {index > 0 ? <span className={styles.breadcrumbSeparator} aria-hidden="true"> / </span> : null}
              {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <div className={styles.headerTop}>
        <div className={styles.headingGroup}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {meta ? <div className={styles.metaRow}>{meta}</div> : null}
      {tabs ? <div className={styles.tabsRow}>{tabs}</div> : null}
    </header>
  );
}
