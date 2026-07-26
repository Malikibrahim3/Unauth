import type { CSSProperties } from 'react';

export const DATA_TABLE_STYLE: CSSProperties = {
  fontSize: 13,
  background: 'transparent',
  borderSpacing: 0,
  borderCollapse: 'separate',
};

export const DATA_TABLE_HEAD_ROW_STYLE: CSSProperties = {
  background: 'var(--ua-surface-primary)',
  borderBottom: '1px solid var(--ua-border-default)',
};

export const DATA_TABLE_HEADER_CELL_BASE: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0',
  color: 'var(--ua-text-tertiary)',
  padding: '0 var(--ua-space-4)',
  height: 36,
  whiteSpace: 'nowrap',
};

export const DATA_TABLE_EMPTY_STYLE: CSSProperties = {
  height: 200,
  fontSize: 12,
  color: 'var(--ua-text-secondary)',
};

export const DATA_TABLE_SKELETON_CELL_STYLE: CSSProperties = {
  padding: 'var(--ua-space-2) var(--ua-space-4)',
};

export const DATA_TABLE_SKELETON_BAR_STYLE: CSSProperties = {
  height: 12,
  borderRadius: 'var(--ua-radius-control)',
};
