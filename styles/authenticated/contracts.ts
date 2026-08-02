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
 * FilterChip is the canonical interactive filter primitive.
 *
 * M8: one selected-state vocabulary product-wide — an accent-500 border
 * edge plus primary ink, never a background fill. This is the same recipe
 * as `tabContract.active`, just applied to a bordered pill instead of an
 * underline. Segmented control below shares it for the same reason.
 */
export const filterChipContract = {
  base: 'inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium transition-colors',
  unselected:
    'border-[var(--ua-border-control)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)]',
  hover: 'hover:bg-[var(--ua-surface-hover)]',
  focus: 'focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]',
  selected:
    'border-[var(--ua-accent-500)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)] shadow-[var(--ua-shadow-none)]',
  disabled:
    'pointer-events-none cursor-not-allowed border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] text-[var(--ua-text-disabled)]',
} as const;

/** SegmentedControl is for mutually exclusive view/sort choices, not route tabs. */
export const segmentedControlContract = {
  root: 'inline-flex items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-control)] bg-[var(--ua-surface-secondary)] p-0.5',
  item: 'inline-flex items-center justify-center rounded-[var(--ua-radius-control)] border border-transparent px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-secondary)] transition-colors',
  itemHeight: 'h-[var(--ua-control-height-sm)]',
  // Same accent-border-edge language as a selected filter chip (M8).
  selectedItem: 'border-[var(--ua-accent-500)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)] shadow-[var(--ua-shadow-none)]',
} as const;

export const tabContract = {
  root: 'flex min-w-0 items-center gap-5 border-b border-[var(--ua-border-default)]',
  item: 'inline-flex h-[var(--ua-control-height-md)] items-center border-b-2 border-transparent px-0.5 text-[length:var(--ua-text-dense-size)] font-medium text-[var(--ua-text-secondary)] transition-colors hover:text-[var(--ua-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ua-border-focus)]',
  // Primary ink plus a 2px accent underline.
  active: 'border-[var(--ua-accent-500)] text-[var(--ua-text-primary)]',
} as const;

export type FilterChipContract = typeof filterChipContract;
export type SegmentedControlContract = typeof segmentedControlContract;

/** Reviewable product rules used by tests and implementation checklists. */
export const authenticatedDesignEthos = {
  reference: 'decision-ledger-instrument-grade',
  shell: '200px expanded or 56px compact navigation plane, 52px utility toolbar, quiet canvas, and one dominant work plane',
  functionality: 'committed routes, actions, permissions, data semantics, and keyboard access remain unchanged',
  visuals: 'browser-native desktop hierarchy shaped by alignment, spacing, typography, joined sections, and restrained accent',
  supportedWidth: 'authenticated product is optimised for 1024px and wider and remains operable in accessibility reflow when browser zoom or text scaling reduces the CSS viewport',
  surfaces: 'one dominant object per view; working surfaces, joined sections, inset groups, and overlays only when depth is meaningful',
  chartData: 'prepared merchant-scoped loader data only; no fake history, null-to-zero conversion, mixed currencies, or duplicate queries',
  chartAccess: 'stable labels, non-colour distinctions, visible data tables, focus states, reduced motion, and touch-safe layouts',
  skeletons: 'loading geometry mirrors the exact chart family plus resolved header, KPI, toolbar, content, and rail positions',
  performance: 'server/CSS operational charts, stable prepared arrays, batched permissions, parallel reads, deferred non-blocking work',
} as const;
