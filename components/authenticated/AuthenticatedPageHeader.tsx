import type { ReactNode } from 'react';
import Link from '@/components/navigation/AppNavLink';
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
  showCurrentBreadcrumb?: boolean;
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
  showCurrentBreadcrumb = true,
}: AuthenticatedPageHeaderProps) {
  const sourceBreadcrumbs = breadcrumbs?.length
    ? breadcrumbs[0]?.label === 'Unauth'
      ? breadcrumbs
      : [{ label: 'Unauth', href: '/overview' }, ...breadcrumbs]
    : [{ label: 'Unauth', href: '/overview' }];
  const visibleBreadcrumbs = sourceBreadcrumbs.filter((item, index) => {
    const isLast = index === sourceBreadcrumbs.length - 1;
    // The H1 is the current location. Keep only true parent links in the
    // breadcrumb row so a record name is not rendered twice above the fold.
    return showCurrentBreadcrumb || !(isLast && (!item.href || item.label === title));
  });

  return (
    <header className={styles.pageHeader} data-capability-id={capabilityId}>
      {visibleBreadcrumbs?.length ? (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {visibleBreadcrumbs.map((item, index) => (
            <span key={item.href ?? item.label}>
              {index > 0 ? (
                <svg className={styles.breadcrumbSeparator} width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
                  <path d="M3 2l3 2.5L3 7" fill="none" stroke="var(--uo-raw-C6C9CE, #C6C9CE)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              ) : null}
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
      {meta ? <div className={styles.metaRow} role="status" aria-label="Current scope and data truth">{meta}</div> : null}
      {tabs ? <div className={styles.tabsRow}>{tabs}</div> : null}
    </header>
  );
}
