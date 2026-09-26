import type { ReactNode } from 'react';
import Link from '@/components/navigation/AppNavLink';

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
    <header data-capability-id={capabilityId} style={{ width: '100%', padding: '12px 22px 11px', borderBottom: '1px solid #eae8e5', background: '#fff' }}>
      {visibleBreadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: '#6f6a63', font: "400 11px/1.4 'Inter',sans-serif", whiteSpace: 'nowrap' }}>
          {visibleBreadcrumbs.map((item, index) => (
            <span key={item.href ?? item.label}>
              {index > 0 ? (
                <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" style={{ display: 'inline-block', margin: '0 3px' }}>
                  <path d="M3 2l3 2.5L3 7" fill="none" stroke="#a7abad" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              ) : null}
              {item.href ? <Link href={item.href} style={{ color: '#64686d', textDecoration: 'none' }}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            </span>
          ))}
        </nav>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <p style={{ margin: '0 0 5px', color: '#6f6a63', font: "400 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em', textTransform: 'uppercase' }}>{eyebrow}</p> : null}
          <h1 style={{ margin: 0, color: '#1c1f23', font: "500 22px/1.28 'Inter',sans-serif", letterSpacing: '-.02em' }}>{title}</h1>
          {subtitle ? <p style={{ maxWidth: '72ch', margin: '4px 0 0', color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{subtitle}</p> : null}
        </div>
        {actions ? <div style={{ display: 'flex', maxWidth: '100%', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>{actions}</div> : null}
      </div>
      {meta ? <div role="status" aria-label="Current scope and data truth" style={{ display: 'flex', maxWidth: '100%', flexWrap: 'wrap', alignItems: 'center', gap: 8, minHeight: 28, marginTop: 9, padding: '5px 8px', borderRadius: 8, background: '#f4f3f1', color: '#64686d', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{meta}</div> : null}
      {tabs ? <div style={{ display: 'flex', maxWidth: '100%', alignItems: 'center', gap: 8, marginTop: 10, overflowX: 'auto' }}>{tabs}</div> : null}
    </header>
  );
}
