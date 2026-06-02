import type { CSSProperties } from 'react';

export const DATA_TABLE_STYLE: CSSProperties = {
  fontSize: 13,
  background: 'var(--surface-raised)',
};

export const DATA_TABLE_HEAD_ROW_STYLE: CSSProperties = {
  background: 'var(--surface-overlay)',
  borderBottom: '1px solid var(--surface-border)',
};

export const DATA_TABLE_HEADER_CELL_BASE: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: 'var(--ink-secondary)',
  padding: '0 14px',
  height: 34,
  whiteSpace: 'nowrap',
};

export const DATA_TABLE_EMPTY_STYLE: CSSProperties = {
  height: 200,
  fontSize: 12,
  color: 'var(--text-muted)',
};

export const DATA_TABLE_SKELETON_CELL_STYLE: CSSProperties = {
  padding: '10px 14px',
};

export const DATA_TABLE_SKELETON_BAR_STYLE: CSSProperties = {
  height: 12,
  borderRadius: 2,
};
