import type { CSSProperties } from 'react';

const RESET_SUBMIT_BUTTON_BASE: CSSProperties = {
  padding: '11px 20px',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  transition: 'background 0.15s',
};

export function resetSubmitButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...RESET_SUBMIT_BUTTON_BASE,
    background: disabled ? 'var(--surface-muted)' : 'var(--copper-bright)',
    color: disabled ? 'var(--ink-tertiary)' : 'var(--ink-inverse)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
