import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageFrame } from '@/components/ui/PageFrame';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

/** A single provenance / owner / updated fact in the §8.4 detail meta row. */
export interface DetailMetaItem {
  /** Quiet lead label, e.g. "Source", "Owner", "Updated". */
  label?: string;
  /** The value itself — a name, a source badge, a relative time. */
  value: ReactNode;
}

/** Previous / next record navigation (§8.4). An absent href renders a disabled edge. */
export interface DetailRecordNav {
  prevHref?: string;
  nextHref?: string;
  prevLabel?: string;
  nextLabel?: string;
}

interface DetailPageShellProps {
  /** Functional back navigation (§8.4). Rendered as an in-page link above the title. */
  backHref?: string;
  backLabel?: string;
  /** Optional eyebrow breadcrumb text (non-linked) */
  eyebrow?: string;
  title: string;
  /** Short line below the title — filename, date, identifier */
  subtitle?: ReactNode;
  /** Badge or status pill next to the title */
  statusBadge?: ReactNode;
  /**
   * Provenance / owner / updated facts (§8.4). Rendered as one quiet meta row
   * under the identity; each item is optional so a route shows only what it has.
   */
  meta?: DetailMetaItem[];
  /** Previous / next record navigation (§8.4). */
  recordNav?: DetailRecordNav;
  /** Metric strip rendered below the header */
  metricStrip?: ReactNode;
  /** Primary action button(s) */
  actions?: ReactNode;
  /** Tabs rendered flush at the bottom of the header */
  tabs?: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Optional fixed-width right rail */
  rail?: ReactNode;
  className?: string;
}

function DetailMetaRow({ items }: { items: DetailMetaItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="ua-detail-meta">
      {items.map((item, index) => (
        <li key={index} className="ua-detail-meta__item">
          {item.label ? <span className="ua-detail-meta__label">{item.label}</span> : null}
          <span className="ua-detail-meta__value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function RecordNav({ recordNav }: { recordNav: DetailRecordNav }) {
  const { prevHref, nextHref, prevLabel = 'Previous record', nextLabel = 'Next record' } = recordNav;
  return (
    <nav className="ua-detail-recordnav" aria-label="Record navigation">
      {prevHref ? (
        <Link href={prevHref} className="ua-detail-recordnav__link" aria-label={prevLabel}>
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className="ua-detail-recordnav__link" aria-disabled="true" aria-label={prevLabel}>
          <ChevronLeft size={16} aria-hidden="true" />
        </span>
      )}
      {nextHref ? (
        <Link href={nextHref} className="ua-detail-recordnav__link" aria-label={nextLabel}>
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className="ua-detail-recordnav__link" aria-disabled="true" aria-label={nextLabel}>
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}

/**
 * Canonical Instrument Grade record-detail shell.
 *
 * One header renders the §8.4 anatomy in a consistent place for every record:
 * functional back navigation, the human-readable identity (never a raw ID),
 * status and provenance, owner and updated time, one primary action, and
 * optional previous/next record navigation. The record's decision surface,
 * evidence, connected objects, and activity remain the route's `children`; the
 * shell owns only the shared header/frame so detail routes stop re-deriving it.
 *
 * A detail route must NOT use a KPI strip in place of its identity summary
 * (§5.3); `metricStrip` is reserved for a genuine lead financial/lifecycle
 * visual, not filler headline counts.
 */
export function DetailPageShell({
  backHref,
  backLabel = 'Back',
  eyebrow,
  title,
  subtitle,
  statusBadge,
  meta,
  recordNav,
  metricStrip,
  actions,
  tabs,
  children,
  rail,
  className,
}: DetailPageShellProps) {
  const metaItems = meta ?? [];
  const headerActions =
    statusBadge || actions || recordNav ? (
      <>
        {statusBadge}
        {actions}
        {recordNav ? <RecordNav recordNav={recordNav} /> : null}
      </>
    ) : undefined;

  const content = rail ? (
    <div className={styles.workbenchGrid}>
      <div className="min-w-0">{children}</div>
      <aside className={styles.rail}>{rail}</aside>
    </div>
  ) : (
    <div className="min-w-0">{children}</div>
  );

  return (
    <div className={cn(className)}>
      <SetBreadcrumbLabel label={title} />
      {backHref ? (
        <div className="ua-detail-back-row">
          <Link href={backHref} className="ua-detail-back">
            <ArrowLeft size={15} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      ) : null}
      <PageFrame
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        meta={metaItems.length > 0 ? <DetailMetaRow items={metaItems} /> : undefined}
        actions={headerActions}
        tabs={tabs}
        headerCapabilityId="detail.heading"
        metrics={metricStrip}
      >
        {content}
      </PageFrame>
    </div>
  );
}
