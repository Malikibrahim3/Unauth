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
  const visibleBreadcrumbs = breadcrumbs?.filter((item, index) => {
    const isLast = index === breadcrumbs.length - 1;
    // The H1 is the current location. Keep only true parent links in the
    // breadcrumb row so a record name is not rendered twice above the fold.
    return !(isLast && (!item.href || item.label === title));
  });

  return (
    <header className={styles.pageHeader} data-capability-id={capabilityId}>
      {visibleBreadcrumbs?.length ? (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {visibleBreadcrumbs.map((item, index) => (
            <span key={item.href ?? item.label}>
              {index > 0 ? <span className={styles.breadcrumbSeparator} aria-hidden="true"> / </span> : null}
              {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <div className={styles.headerTop}>
        <div className={styles.headingGroup}>
          {eyebrow ? <p className={styles.contextLabel}>{eyebrow}</p> : null}
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
