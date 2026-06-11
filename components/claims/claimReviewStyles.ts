import type { CSSProperties } from 'react';

export const CLAIM_REVIEW_PANEL_ROOT_STYLE: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-canvas)',
};

export const STATUS_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  open: { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' },
  under_review: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  evidence_requested: { bg: 'var(--sev-probable-fill)', text: 'var(--warning)' },
  pending: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  escalated: { bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical)' },
  resolved: { bg: 'var(--success-bg)', text: 'var(--success)' },
  closed: { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' },
};

export const SLA_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  normal: { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' },
  approaching: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  overdue: { bg: 'var(--sev-probable-fill)', text: 'var(--warning)' },
  resolved: { bg: 'var(--success-bg)', text: 'var(--success)' },
};

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function formatClaimMoney(value: number | null | undefined, _currency?: string | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return MONEY_FORMATTER.format(value);
}

export function inputStyle(): CSSProperties {
  return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' };
}

export function btnStyle(variant: 'primary' | 'secondary' | 'muted' | 'disabled'): CSSProperties {
  if (variant === 'primary') return { background: 'var(--accent)', color: 'white' };
  if (variant === 'muted') {
    return { border: '1px solid var(--border-muted)', background: 'var(--bg-inset)', color: 'var(--text-secondary)' };
  }
  if (variant === 'disabled') {
    return { border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text-secondary)' };
  }
  return { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' };
}

export function slaToneStyle(tone: 'red' | 'amber' | 'gray'): { bg: string; text: string } {
  if (tone === 'red') return { bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical)' };
  if (tone === 'amber') return { bg: 'var(--warning-bg)', text: 'var(--warning)' };
  return { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' };
}
