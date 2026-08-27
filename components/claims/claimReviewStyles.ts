import type { CSSProperties } from 'react';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { formatCurrency } from '@/lib/utils/format';

export const CLAIM_REVIEW_PANEL_ROOT_STYLE: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--uo-route-canvas)',
};

export function formatClaimMoney(value: number | null | undefined, currency?: string | null) {
  const code = normaliseCurrencyOrNull(currency);
  if (typeof value !== 'number' || Number.isNaN(value) || !code) return '—';
  return formatCurrency(value, code);
}

export function inputStyle(): CSSProperties {
  return { border: '1px solid var(--uo-route-border-default)', background: 'var(--uo-route-surface-secondary)', color: 'var(--uo-route-text-primary)' };
}

export function btnStyle(variant: 'primary' | 'secondary' | 'muted' | 'disabled'): CSSProperties {
  if (variant === 'primary') return { background: 'var(--uo-route-action-primary)', color: 'var(--uo-route-action-primary-fg)' };
  if (variant === 'muted') {
    return { border: '1px solid var(--uo-route-border-subtle)', background: 'var(--uo-route-surface-secondary)', color: 'var(--uo-route-text-secondary)' };
  }
  if (variant === 'disabled') {
    return { border: '1px solid var(--uo-route-border-default)', background: 'var(--uo-route-surface-secondary)', color: 'var(--uo-route-text-secondary)' };
  }
  return { border: '1px solid var(--uo-route-border-default)', background: 'var(--uo-route-surface-primary)', color: 'var(--uo-route-text-primary)' };
}

export function slaToneStyle(tone: 'red' | 'amber' | 'gray'): { bg: string; text: string } {
  if (tone === 'red') return { bg: 'var(--uo-route-risk-critical-bg)', text: 'var(--uo-route-risk-critical)' };
  if (tone === 'amber') return { bg: 'var(--uo-route-warning-bg)', text: 'var(--uo-route-warning)' };
  return { bg: 'var(--uo-route-surface-secondary)', text: 'var(--uo-route-text-secondary)' };
}
