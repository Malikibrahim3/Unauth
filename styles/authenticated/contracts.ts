/**
 * Typed class contracts for the authenticated component taxonomy.
 *
 * Components own behaviour and accessibility. These strings only describe
 * the shared geometry and token-backed visual contract.
 */
export const controlContract = {
  base: 'inline-flex items-center justify-center gap-2 rounded-[var(--ua-radius-control)] border font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  sm: 'h-[var(--ua-control-height-sm)] px-[var(--ua-control-padding-x-sm)] text-xs',
  md: 'h-[var(--ua-control-height-md)] px-[var(--ua-control-padding-x-md)] text-[13px]',
  lg: 'h-[var(--ua-control-height-lg)] px-[var(--ua-control-padding-x-lg)] text-sm',
} as const;

export const filterChipContract = {
  base: 'inline-flex h-[var(--ua-chip-height)] items-center justify-center gap-1.5 rounded-[var(--ua-radius-pill)] border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  unselected:
    'border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)] hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
  hover: 'hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)]',
  selected:
    'border-[var(--ua-text-primary)] bg-[var(--ua-surface-inverse)] text-[var(--ua-text-inverse)]',
  disabled: 'cursor-not-allowed opacity-50',
} as const;

export const segmentedControlContract = {
  root: 'inline-flex items-center overflow-hidden rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-secondary)] p-0.5',
  item: 'inline-flex h-[var(--ua-control-height-sm)] items-center justify-center px-3 text-[13px] font-medium text-[var(--ua-text-secondary)] transition-colors focus-visible:outline-none',
  itemHeight: 'h-[var(--ua-control-height-sm)]',
  selectedItem:
    'rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-primary)] shadow-[var(--ua-shadow-subtle)]',
} as const;

export const tabContract = {
  root: 'flex min-w-0 items-center gap-5 border-b border-[var(--ua-border-default)]',
  item: 'inline-flex h-[var(--ua-control-height-md)] items-center border-b-2 border-transparent px-0.5 text-[13px] font-medium text-[var(--ua-text-secondary)] transition-colors hover:text-[var(--ua-text-primary)] focus-visible:outline-none',
  active: 'border-[var(--ua-text-primary)] text-[var(--ua-text-primary)]',
} as const;

export type FilterChipContract = typeof filterChipContract;
export type SegmentedControlContract = typeof segmentedControlContract;
