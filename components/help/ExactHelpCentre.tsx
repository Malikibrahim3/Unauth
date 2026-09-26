'use client';

import { Children, cloneElement, createElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Help-Clean';

import { HELP_INDEX_GROUPS, HELP_INDEX_INTRO, HelpArticleGroups } from './HelpArticleGroups';

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

function bindHelpTree(node: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode; href?: string; style?: CSSProperties }>(node)) return node;
  const visibleText = compactText(node);
  const props: Record<string, unknown> = {};
  if (node.type === 'div' && node.props.style?.gridTemplateColumns === '1fr 1fr') {
    return cloneElement(node as ReactElement, {}, createElement(HelpArticleGroups, { groups: HELP_INDEX_GROUPS }));
  }
  if (node.type === 'div' && visibleText.startsWith('Fourteen articles,')) {
    return cloneElement(node as ReactElement, {}, HELP_INDEX_INTRO);
  }
  if (node.type === 'div' && node.props.style?.overflow === 'hidden' && visibleText.includes('How this product wants to be used') && visibleText.includes('GETTING THE EVIDENCE RIGHT')) {
    props['data-surface-id'] = 'help-index';
    props['data-reference-id'] = 'Help-Clean';
    props['data-route-state'] = 'loaded';
    props.style = { ...node.props.style, overflowY: 'auto' };
    props.role = 'region';
    props['aria-label'] = 'Help articles';
    props.tabIndex = 0;
  }
  if (node.type === 'span' && visibleText === 'Search the articles') {
    return createElement('input', { name: 'q', type: 'text', maxLength: 100, 'aria-label': 'Search the articles', placeholder: 'Search the articles', style: { ...node.props.style, minWidth: 0, padding: 0, border: 0, outline: 0, background: 'transparent', color: '#1c1f23' } });
  }
  const children = Children.map(node.props.children, bindHelpTree);
  if (node.type === 'div' && visibleText === 'Search the articles') {
    return createElement('form', { ...node.props, action: '/help', method: 'get', role: 'search', style: { ...node.props.style, margin: 0 } }, children);
  }
  if (visibleText === 'Ask a person') {
    return createElement('a', { ...node.props, href: 'mailto:support@unauth.app', style: { ...node.props.style, textDecoration: 'none' } }, children);
  }
  return cloneElement(node as ReactElement, props, children);
}

export function ExactHelpCentre() {
  return bindHelpTree(SuppliedVisualBody());
}
