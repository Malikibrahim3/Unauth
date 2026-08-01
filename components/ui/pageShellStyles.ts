import type { CSSProperties } from 'react';

export const PAGE_SHELL_INNER_CLASS =
  'mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8';

export const PAGE_SHELL_HEADER_CLASS =
  'mx-auto flex w-full max-w-[1500px] flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:px-8';

// Instrument Grade page title: compact product chrome, never a marketing H1.
export const PAGE_TITLE_STYLE: CSSProperties = {
  color: 'var(--ua-text-primary)',
  fontSize: 18,
  fontWeight: 600,
  lineHeight: '24px',
  letterSpacing: 0,
  fontFamily: 'var(--ua-font-sans)',
};

export const PAGE_SUBTITLE_STYLE: CSSProperties = {
  color: 'var(--ua-text-secondary)',
  fontSize: 14,
  lineHeight: '20px',
  maxWidth: 760,
};

export const PAGE_EYEBROW_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--ua-text-tertiary)',
  lineHeight: '14px',
};

export const PAGE_BAND_STYLE: CSSProperties = {
  background: 'var(--ua-canvas)',
};

export const PAGE_HEADER_STYLE: CSSProperties = {
  background: 'var(--ua-canvas)',
  borderBottom: '1px solid var(--ua-border-default)',
};

export const PAGE_SECTION_DIVIDER_STYLE: CSSProperties = {
  borderBottom: '1px solid var(--ua-border-default)',
};

export const PAGE_TOOLBAR_STYLE: CSSProperties = {
  background: 'var(--ua-canvas)',
  borderBottom: '1px solid var(--ua-border-default)',
};

export const PAGE_PANEL_STYLE: CSSProperties = {
  background: 'var(--ua-surface-primary)',
  border: '1px solid var(--ua-border-default)',
  borderRadius: 'var(--ua-radius-surface)',
  boxShadow: 'none',
};
