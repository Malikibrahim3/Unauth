import type { CSSProperties } from 'react';

export const PAGE_SHELL_INNER_CLASS =
  'mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8';

export const PAGE_SHELL_HEADER_CLASS =
  'mx-auto flex w-full max-w-[1500px] flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:px-8';

// WS4.5: compact list-page title (20px/600), not a 40px marketing H1.
export const PAGE_TITLE_STYLE: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 'clamp(1.25rem, 1.6vw, 1.5rem)',
  fontWeight: 650,
  lineHeight: 1.2,
  letterSpacing: '-0.025em',
  fontFamily: 'var(--font-sans)',
};

export const PAGE_SUBTITLE_STYLE: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14,
  lineHeight: 1.55,
  maxWidth: 760,
};

export const PAGE_EYEBROW_STYLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-tertiary)',
  lineHeight: 1.2,
};

export const PAGE_BAND_STYLE: CSSProperties = {
  background: 'var(--bg-canvas)',
};

export const PAGE_HEADER_STYLE: CSSProperties = {
  background: 'var(--bg-canvas)',
  borderBottom: '1px solid var(--border)',
};

export const PAGE_SECTION_DIVIDER_STYLE: CSSProperties = {
  borderBottom: '1px solid var(--border)',
};

export const PAGE_TOOLBAR_STYLE: CSSProperties = {
  background: 'var(--bg-canvas)',
  borderBottom: '1px solid var(--border)',
};

export const PAGE_PANEL_STYLE: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'none',
};
