import type { CSSProperties } from 'react';
import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { formatCurrency } from '@/lib/utils/format';

export const CLAIM_REVIEW_PANEL_ROOT_STYLE: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ua-canvas)',
};

export const STATUS_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  new: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
  evidence_needed: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  awaiting_customer_evidence: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  awaiting_carrier_response: { bg: 'var(--ua-info-bg)', text: 'var(--ua-info)' },
  awaiting_3pl_response: { bg: 'var(--ua-info-bg)', text: 'var(--ua-info)' },
  awaiting_supplier_response: { bg: 'var(--ua-info-bg)', text: 'var(--ua-info)' },
  ready_for_decision: { bg: 'var(--ua-success-bg)', text: 'var(--ua-success)' },
  manual_review: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  decision_recorded: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
  recovery_opened: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
  open: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
  under_review: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  evidence_requested: { bg: 'var(--ua-severity-probable-bg)', text: 'var(--ua-warning)' },
  pending: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  escalated: { bg: 'var(--ua-risk-critical-bg)', text: 'var(--ua-risk-critical)' },
  resolved: { bg: 'var(--ua-success-bg)', text: 'var(--ua-success)' },
  closed: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
};

export const SLA_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  normal: { bg: 'var(--ua-surface-secondary)', text: 'var(--ua-text-secondary)' },
  approaching: { bg: 'var(--ua-warning-bg)', text: 'var(--ua-warning)' },
  overdue: { bg: 'var(--ua-severity-probable-bg)', text: 'var(--ua-warning)' },
  resolved: { bg: 'var(--ua-success-bg)', text: 'var(--ua-success)' },
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
