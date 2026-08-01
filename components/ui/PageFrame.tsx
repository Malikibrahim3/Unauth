import type { ReactNode } from 'react';
import {
  AuthenticatedPageHeader,
  type Breadcrumb,
} from '@/components/authenticated/AuthenticatedPageHeader';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

/**
 * Canonical Instrument Grade authenticated page frame.
 *
 * Every signed-in route composes the same six-part frame: the utility header
 * (owned by the app layout), then this compact page header, optional local
 * navigation/tabs, an optional filter/action rail, the content grid, and the
 * route state/feedback layer. Bespoke dashboard/Workbench/detail shells
 * delegate to this frame rather than re-deriving the header + body geometry
 * (§8.1 consolidation map).
 *
 * Body regions render in the §5.1 order: adaptive KPI group → primary visual →
 * toolbar → content → footer. Each slot is optional so a one-metric or a
 * chart-free route keeps intentional whitespace instead of an empty region.
 *
 * KPI rules the frame enforces by construction:
 *  - a route passes `metrics` only when a small set of headline values earns
 *    the space. A record-detail, builder, settings, or single-record route
 *    must NOT use a KPI strip — its status/provenance and its lead visual
 *    carry the summary instead (§5.3, §5.4). Leave `metrics` undefined there.
 *  - the same fact never appears in `metrics`, a prose callout, and a rail at
 *    once (§5.5, LP-CMP-12). Pick one home for each number.
 */
export type PageFrameProps = {
  // §5.1 compact page header.
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Freshness/source metadata line under the title. */
  meta?: ReactNode;
  /** Optional local navigation / in-page tabs. */
  tabs?: ReactNode;
  /** At most one secondary and one primary action (§5.1). */
  actions?: ReactNode;
  headerCapabilityId?: string;

  // §5.1 body regions, in order.
  /** Adaptive KPI group (§5.3). Omit for detail/builder/settings routes. */
  metrics?: ReactNode;
  /** Hero chart or work surface (§5.2: at least 60% visible in the first viewport). */
  primaryVisual?: ReactNode;
  /** Filter/action rail (§5.1). */
  toolbar?: ReactNode;
  /** Main content grid — one dominant working surface (§5.2). */
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function PageFrame({
  title,
  eyebrow,
  subtitle,
  breadcrumbs,
  meta,
  tabs,
  actions,
  headerCapabilityId,
  metrics,
  primaryVisual,
  toolbar,
  children,
  footer,
  className,
}: PageFrameProps) {
  return (
    <div className={className}>
      <AuthenticatedPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        meta={meta}
        tabs={tabs}
        actions={actions}
        capabilityId={headerCapabilityId}
      />
      <div className={styles.pageBody}>
        <div className={styles.workbenchStack}>
          {metrics}
          {primaryVisual}
          {toolbar}
          {children}
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}
