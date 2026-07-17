/**
 * Typed style contracts for the authenticated design system.
 *
 * This is NOT a second token system — every value below is a CSS variable
 * reference (`var(--ua-*)`), never a literal hex/px value. Where a
 * canonical component already implements a contract (Button, Badge), this
 * file points at it instead of duplicating its values — see
 * styles/authenticated/README.md's "one primitive per situation" section.
 */

/**
 * Button and Badge already have a full, canonical, token-driven
 * implementation — do not duplicate their variant logic here.
 * @see components/ui/buttonStyles.ts `getButtonPresentation()`
 * @see components/ui/badgeStyles.ts
 */

/** Filter chips have no canonical component yet. This is the intended
 * contract for whoever builds one next — see the migration register. */
export const filterChipContract = {
  base: 'inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border px-2.5 text-[11px] font-medium transition-colors',
  unselected:
    'border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)]',
  hover: 'hover:bg-[var(--ua-surface-hover)]',
  selected:
    'border-[var(--ua-border-strong)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)] shadow-[var(--ua-shadow-subtle)]',
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const;

/** Segmented controls have no canonical component yet. This is the
 * intended contract for whoever builds one next — see the migration
 * register. Use only for mutually exclusive views/sort choices. */
export const segmentedControlContract = {
  root: 'inline-flex items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-secondary)] p-0.5',
  item: 'inline-flex items-center justify-center rounded-[var(--ua-radius-control)] px-2.5 text-[11px] font-medium text-[var(--ua-text-secondary)] transition-colors',
  itemHeight: 'h-[var(--ua-control-height-sm)]',
  selectedItem: 'bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)] shadow-[var(--ua-shadow-subtle)]',
} as const;

export type FilterChipContract = typeof filterChipContract;
export type SegmentedControlContract = typeof segmentedControlContract;

/** Reviewable product rules used by tests and implementation checklists. */
export const authenticatedDesignEthos = {
  reference: 'approved-dashboard-autumn',
  shell: '208px warm rail, 48px utility header, warm canvas, dense bordered cards',
  functionality: 'committed routes, actions, permissions, data semantics, and keyboard/mobile access remain unchanged',
  visuals: 'one purpose-selected primary visual on most data-rich operational pages; shared grammar without repeated compositions',
  chartData: 'prepared merchant-scoped loader data only; no fake history, null-to-zero conversion, mixed currencies, or duplicate queries',
  chartAccess: 'stable labels, non-colour distinctions, visible data tables, focus states, reduced motion, and touch-safe layouts',
  skeletons: 'loading geometry mirrors the exact chart family plus resolved header, KPI, toolbar, content, and rail positions',
  performance: 'server/CSS operational charts, stable prepared arrays, batched permissions, parallel reads, deferred non-blocking work',
} as const;
