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

/**
 * FilterChip is the canonical interactive filter primitive. Living Precision
 * §4.2: a selected filter is accent-100 fill, accent-200 border, accent-800
 * text — selection is accent, never semantic and never a neutral-only hairline.
 */
export const filterChipContract = {
  base: 'inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium transition-colors',
  unselected:
    'border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)]',
  hover: 'hover:bg-[var(--ua-surface-hover)]',
  focus: 'focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]',
  selected:
    'border-[var(--ua-accent-200)] bg-[var(--ua-accent-100)] text-[var(--ua-accent-800)] shadow-[var(--ua-shadow-none)]',
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const;

/** SegmentedControl is for mutually exclusive view/sort choices, not route tabs. */
export const segmentedControlContract = {
  root: 'inline-flex items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-secondary)] p-0.5',
  item: 'inline-flex items-center justify-center rounded-[var(--ua-radius-control)] px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-secondary)] transition-colors',
  itemHeight: 'h-[var(--ua-control-height-sm)]',
  // §4.2 — the selected segment is the same accent selection language as a
  // selected filter, so one selection idiom reads across the product.
  selectedItem: 'bg-[var(--ua-accent-100)] text-[var(--ua-accent-800)] shadow-[var(--ua-shadow-none)]',
} as const;

export const tabContract = {
  root: 'flex min-w-0 items-center gap-5 border-b border-[var(--ua-border-default)]',
  item: 'inline-flex h-[var(--ua-control-height-md)] items-center border-b-2 border-transparent px-0.5 text-[length:var(--ua-text-dense-size)] font-medium text-[var(--ua-text-secondary)] transition-colors hover:text-[var(--ua-text-primary)] focus-visible:outline-none',
  // §4.2 — primary ink plus a 2px accent underline.
  active: 'border-[var(--ua-accent-500)] text-[var(--ua-text-primary)]',
} as const;

export type FilterChipContract = typeof filterChipContract;
export type SegmentedControlContract = typeof segmentedControlContract;

/** Reviewable product rules used by tests and implementation checklists. */
export const authenticatedDesignEthos = {
  reference: 'living-precision',
  shell: '200px neutral rail, 48px utility header, near-white canvas, dense flat surfaces',
  functionality: 'committed routes, actions, permissions, data semantics, and keyboard access remain unchanged',
  visuals: 'one purpose-selected primary visual on most data-rich operational pages; shared grammar without repeated compositions',
  supportedWidth: 'authenticated product is operable at 1024px and wider; one shared Desktop required boundary renders below 1024px',
  surfaces: 'working surface, joined section, inset group, metric group, and floating surface; no standard surface inside another',
  chartData: 'prepared merchant-scoped loader data only; no fake history, null-to-zero conversion, mixed currencies, or duplicate queries',
  chartAccess: 'stable labels, non-colour distinctions, visible data tables, focus states, reduced motion, and touch-safe layouts',
  skeletons: 'loading geometry mirrors the exact chart family plus resolved header, KPI, toolbar, content, and rail positions',
  performance: 'server/CSS operational charts, stable prepared arrays, batched permissions, parallel reads, deferred non-blocking work',
} as const;
