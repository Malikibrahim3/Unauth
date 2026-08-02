import type { CSSProperties } from 'react';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { formatCurrency } from '@/lib/utils/format';

export const CLAIM_REVIEW_PANEL_ROOT_STYLE: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ua-canvas)',
};

export function formatClaimMoney(value: number | null | undefined, currency?: string | null) {
  const code = normaliseCurrencyOrNull(currency);
  if (typeof value !== 'number' || Number.isNaN(value) || !code) return '—';
  return formatCurrency(value, code);
}

export function inputStyle(): CSSProperties {
  return { border: '1px solid var(--ua-border-default)', background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-primary)' };
}

export function btnStyle(variant: 'primary' | 'secondary' | 'muted' | 'disabled'): CSSProperties {
  if (variant === 'primary') return { background: 'var(--ua-action-primary)', color: 'var(--ua-action-primary-fg)' };
  if (variant === 'muted') {
    return { border: '1px solid var(--ua-border-subtle)', background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' };
  }
  if (variant === 'disabled') {
    return { border: '1px solid var(--ua-border-default)', background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' };
  }
  return { border: '1px solid var(--ua-border-default)', background: 'var(--ua-surface-primary)', color: 'var(--ua-text-primary)' };
}

export function slaToneStyle(tone: 'red' | 'amber' | 'gray'): { bg: string; text: string } {
  if (tone === 'red') return { bg: 'var(--ua-risk-critical-bg)', text: 'var(--ua-risk-critical)' };
  if (tone === 'amber') return { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' };
  return { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' };
}
