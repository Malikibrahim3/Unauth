import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/ui/Surface';

/**
 * Canonical Instrument Grade registry surface.
 *
 * §8.3 rule 1: "Toolbar, result count, table, bulk action, and pagination
 * belong to one surface." Before this primitive, registries stacked a bordered
 * filter panel, a loose result-count row, a bordered `DataTable`, and a loose
 * pagination row inside the working panel — several bordered cards nested in
 * one working surface, which §8.2 forbids.
 *
 * `RegistrySurface` is a single §8.2 `working` surface that owns the frame and
 * splits its interior with dividers rather than nesting rectangles:
 *
 *   ┌ working surface ─────────────────────────────┐
 *   │ toolbar (filters / bulk actions)   resultCount│  ← divider below
 *   │ body (a DataTable rendered `flush`, or a      │
 *   │       geometry-aware OperationalState)        │
 *   │ pagination                                    │  ← divider above
 *   └───────────────────────────────────────────────┘
 *
 * The table renders `flush` so it does not carry its own border/radius — the
 * surface owns the single frame. Horizontal overflow stays inside the body
 * region (the surface clips), so a wide table never breaks the rounded card.
 *
 * When a selection is active, pass `bulkActions`; it replaces the toolbar's
 * lead content for that row so bulk controls read as one contextual bar rather
 * than a second stacked toolbar. Selection styling belongs to the row/filter
 * primitives and stays accent, never a semantic status tone (LP-CMP-10).
 */
export interface RegistrySurfaceProps {
  /** Filters, search, and view controls. Lives in the toolbar row's lead slot. */
  toolbar?: ReactNode;
  /** Result summary, e.g. "Showing 1–25 of 340". Right-aligned in the toolbar row. */
  resultCount?: ReactNode;
  /**
   * Bulk actions for the current selection. When present, they take the
   * toolbar's lead slot in place of `toolbar` so there is one contextual bar,
   * not two stacked toolbars.
   */
  bulkActions?: ReactNode;
  /** The table body — a `DataTable flush`, or a geometry-aware `OperationalState`. */
  children: ReactNode;
  /** Pagination / page-size footer. */
  pagination?: ReactNode;
  /** Names the registry region for assistive tech (e.g. "Customers"). */
  'aria-label'?: string;
  className?: string;
}

export function RegistrySurface({
  toolbar,
  resultCount,
  bulkActions,
  children,
  pagination,
  'aria-label': ariaLabel,
  className,
}: RegistrySurfaceProps) {
  const lead = bulkActions ?? toolbar;
  const hasToolbar = lead != null || resultCount != null;
  return (
    <Surface
      structure="working"
      as="section"
      className={cn('ua-registry-surface', className)}
      aria-label={ariaLabel}
    >
      {hasToolbar ? (
        <div className="ua-registry-surface__toolbar">
          {lead != null ? <div className="ua-registry-surface__toolbar-lead">{lead}</div> : null}
          {resultCount != null ? (
            <p className="ua-registry-surface__result-count" role="status" aria-live="polite">
              {resultCount}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="ua-registry-surface__body">{children}</div>
      {pagination != null ? (
        <div className="ua-registry-surface__pagination">{pagination}</div>
      ) : null}
    </Surface>
  );
}
