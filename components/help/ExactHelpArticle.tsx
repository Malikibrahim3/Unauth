'use client';

import { Children, cloneElement, createElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Help-Article-Clean';

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

function bindArticle(node: ReactNode, answer: 'yes' | 'no' | null, record: (answer: 'yes' | 'no') => void): ReactNode {
  if (!isValidElement<{ children?: ReactNode; style?: React.CSSProperties }>(node)) return node;
  const text = compactText(node);
  const props: Record<string, unknown> = {};
  if (text === 'Yes' || text === 'Not really') {
    const value = text === 'Yes' ? 'yes' : 'no';
    props.role = 'button';
    props.tabIndex = 0;
    props['aria-pressed'] = answer === value;
    props.onClick = () => record(value);
    props.style = { ...node.props.style, background: answer === value ? '#f4f2ef' : node.props.style?.background ?? '#fff', cursor: 'pointer' };
  }
  if (node.type === 'div' && node.props.style?.overflow === 'hidden' && text.includes('These four words describe four different amounts') && text.includes('WHERE THIS APPLIES')) {
    props['data-surface-id'] = 'help-article';
    props['data-reference-id'] = 'Help-Article-Clean';
    props['data-help-article'] = 'credit-reconciliation';
    props['data-route-state'] = 'loaded';
    props.style = { ...node.props.style, overflowY: 'auto' };
    props.role = 'region';
    props['aria-label'] = 'Help article';
    props.tabIndex = 0;
  }
  const children = Children.map(node.props.children, (child) => bindArticle(child, answer, record));
  if (text === 'Yes' || text === 'Not really') {
    return createElement('button', { ...node.props, ...props, type: 'button', style: { appearance: 'none', border: 0, ...props.style as React.CSSProperties } }, children);
  }
  return cloneElement(node as ReactElement, props, children);
}

export function ExactHelpArticle() {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const record = (next: 'yes' | 'no') => {
    setAnswer(next);
    try { window.localStorage.setItem('unauth.help.credit-reconciliation.feedback', next); } catch { /* Keep feedback usable in this view when browser storage is unavailable. */ }
  };
  return bindArticle(SuppliedVisualBody(), answer, record);
}
