import type { CSSProperties } from 'react';

export const DATA_TABLE_STYLE: CSSProperties = {
  fontSize: 13,
  background: 'transparent',
  borderSpacing: 0,
  borderCollapse: 'separate',
};

export const DATA_TABLE_HEAD_ROW_STYLE: CSSProperties = {
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
};

export const DATA_TABLE_HEADER_CELL_BASE: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0',
  color: 'var(--text-tertiary)',
  padding: '0 16px',
  height: 42,
  whiteSpace: 'nowrap',
};

export const DATA_TABLE_EMPTY_STYLE: CSSProperties = {
  height: 200,
  fontSize: 12,
  color: 'var(--text-secondary)',
};

export const DATA_TABLE_SKELETON_CELL_STYLE: CSSProperties = {
  padding: '10px 16px',
};

export const DATA_TABLE_SKELETON_BAR_STYLE: CSSProperties = {
  height: 12,
  borderRadius: 2,
};
