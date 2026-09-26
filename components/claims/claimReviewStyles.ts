import type { CSSProperties } from 'react';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { formatCurrency } from '@/lib/utils/format';

export const CLAIM_REVIEW_PANEL_ROOT_STYLE: CSSProperties = {
  minHeight: '100vh',
  background: '#ffffff',
};

export function formatClaimMoney(value: number | null | undefined, currency?: string | null) {
  const code = normaliseCurrencyOrNull(currency);
  if (typeof value !== 'number' || Number.isNaN(value) || !code) return '—';
  return formatCurrency(value, code);
}

export function inputStyle(): CSSProperties {
  return { border: '1px solid #e4e3e0', background: '#f4f3f1', color: '#1c1f23' };
}

export function btnStyle(variant: 'primary' | 'secondary' | 'muted' | 'disabled'): CSSProperties {
  if (variant === 'primary') return { background: '#9f4f08', color: '#fff' };
  if (variant === 'muted') {
    return { border: '1px solid #eae8e5', background: '#f4f3f1', color: '#64686d' };
  }
  if (variant === 'disabled') {
    return { border: '1px solid #e4e3e0', background: '#f4f3f1', color: '#64686d' };
  }
  return { border: '1px solid #e4e3e0', background: '#fff', color: '#1c1f23' };
}

export function slaToneStyle(tone: 'red' | 'amber' | 'gray'): { bg: string; text: string } {
  if (tone === 'red') return { bg: '#fdf0e6', text: '#b0431a' };
  if (tone === 'amber') return { bg: '#fff3e9', text: '#7a5310' };
  return { bg: '#f4f3f1', text: '#64686d' };
}
