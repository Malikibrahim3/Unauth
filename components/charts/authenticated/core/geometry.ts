/**
 * Plot-geometry SSOT for the authenticated chart language (T1–T10).
 * Every hardcoded plot dimension in a chart component must come from here —
 * panel-level chrome (radii, shadows, control heights) still comes from --ua-* tokens.
 */

// T3 — trend line
/** §6.3 — the primary line is 2.25px; comparison lines stay 1.5–2px. */
export const TREND_LINE_WIDTH = 2.25;
export const TREND_HOVER_DOT_R = 4;
export const TREND_HOVER_DOT_RING = 2;
export const TREND_MAX_SERIES = 3;

// T4 — flat bars + dashed comparison
/** Spec §8.3: bars carry a 4px radius at the data end only. */
export const BAR_END_RADIUS = 4;
/*
 * Living Precision §6.3 bar weight. A bar that reads as a hairline reads as
 * decoration: bandwidth (72–82% target, 65% floor) takes precedence over
 * stretching a few columns across a wide plot, and no desktop bar goes below
 * 12px. The previous 30px cap with a 28% category gap produced ~65% bandwidth
 * at best and thin columns at worst.
 */
export const BAR_CATEGORY_GAP = '18%';
/** Low-cardinality vertical columns: 36–44px, default 42px. */
export const BAR_MAX_SIZE = 42;
/** Absolute desktop floor for a mark-carrying bar. */
export const BAR_MIN_SIZE = 12;
/** Ranked and progress bars. */
export const RANKED_BAR_HEIGHT = 12;
/** Mini meters. */
export const METER_HEIGHT = 8;
export const COMPARISON_DASH: [number, number] = [5, 4];
export const COMPARISON_LINE_WIDTH = 1.5;
export const COMPARISON_DOT_R = 2.5;
export const COMPARISON_DOT_RING = 2;

// T5 — dot-matrix
export const MATRIX_CELL = 7;
export const MATRIX_GAP = 2;
export const MATRIX_RADIUS = 2;
export const MATRIX_MAX_COLS = 26;
export const MATRIX_MAX_ROWS = 7;

// T6 — block rail
export const RAIL_HEIGHT = 36;
export const RAIL_HEIGHT_COMPACT = 28;
export const RAIL_BLOCK_RADIUS = 4;
export const RAIL_BLOCK_GAP = 3;
export const RAIL_BLOCK_MIN_W = 6;
export const RAIL_PIN_WIDTH = 1;
export const RAIL_PIN_MIN_H = 16;
export const RAIL_PIN_MAX_H = 28;

// T7 — tick meter
export const TICK_W = 3;
export const TICK_H = 14;
export const TICK_GAP = 2;
export const TICK_RADIUS = 1;
export const TICK_COUNT_MIN = 40;
export const TICK_COUNT_MAX = 56;

// T8 — segment composition
export const SEGMENT_BAR_H = 10;
export const SEGMENT_GAP = 4;
export const SEGMENT_RADIUS = 3;
export const SEGMENT_MAX = 6;
export const LEGEND_DOT_SIZE = 6;

// T9 — metric tab strip
export const TAB_ICON_CHIP = 24;
export const TAB_ICON_SIZE = 14;

// T10 — cursor + tooltip
export const CURSOR_DASH: [number, number] = [4, 4];
export const CURSOR_WIDTH = 1;
export const TOOLTIP_PADDING_Y = 8;
export const TOOLTIP_PADDING_X = 10;

// T1 — cartesian frame
export const PLOT_PAD_TOP = 12;
export const PLOT_PAD_BOTTOM = 8;
/** Currency-aware gutter keeps £/$ values readable instead of clipping the first digit. */
export const Y_LABEL_GUTTER = 64;
export const Y_LABEL_TICK_MARGIN = 8;
export const GRID_LINE_MAX = 5;

// Performance caps (§11)
export const TREND_MAX_BUCKETS = 60;

// Interaction (§8)
export const MIN_HIT_AREA = 24;
export const MIN_HIT_AREA_TOUCH = 40;
export const MOTION_DURATION_MS = 120;
