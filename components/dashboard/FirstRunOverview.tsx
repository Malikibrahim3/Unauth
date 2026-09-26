'use client';

import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement } from 'react';
import Link from '@/components/navigation/AppNavLink';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/First-Run-Clean';
import { bindSuppliedTree } from '@/components/visual-authority/bindSuppliedTree';
import { useAuthenticatedShellPresentation } from '@/components/layout/BreadcrumbOverrideContext';
import { PERMISSIONS, type Permission } from '@/lib/permissions/constants';

const FIRST_RUN = { kind: 'first-run' } as const;

export function FirstRunOverview({ workspaceName, permissions }: { workspaceName: string | null; permissions: Permission[] }) {
  useAuthenticatedShellPresentation(FIRST_RUN);
  const canViewSources = permissions.includes(PERMISSIONS.VIEW_SETTINGS);
  const canManage = permissions.includes(PERMISSIONS.MANAGE_SETTINGS);
  const actions = new Map([
    ['Connect Shopify', { href: '/sources/setup/shopify', allowed: canManage }],
    ['Choose a provider', { href: '/sources/browse?category=helpdesk', allowed: canViewSources }],
    ['Upload a file', { href: '/sources/imports', allowed: canManage }],
    ['Browse all 40 providers', { href: '/sources/browse', allowed: canViewSources }],
  ]);
  return bindSuppliedTree(SuppliedVisualBody(), {
    text: new Map([
      ['Three connections and Asterlane can tell you what your losses cost', `Three connections and ${workspaceName?.trim() || 'your workspace'} can tell you what your losses cost`],
      ['Browse all 40 providers', 'Browse available providers'],
      ['Orders, refunds and customers. Without this there is nothing to attach a loss to. Takes about a minute — you will be sent to Shopify to sign in.', 'Orders, refunds and customers. Without this there is nothing to attach a loss to. Open source setup to review access before authorising Shopify.'],
      ['A CSV of losses you have already absorbed. Twelve months is enough to see a pattern; without it the first useful figure is four weeks away.', 'A CSV of losses you have already absorbed. Available history determines which periods and patterns can be shown.'],
      ['TYPICAL FIRST WEEK', 'YOUR FIRST IMPORT'],
      ['200–400', 'Not imported'],
      ['1 in 6', 'Not assessed'],
      ['same day', 'Not recorded'],
    ]),
    transform: (element, text, children) => {
      if (element.type === 'div' && element.props.style?.padding === '26px 22px 22px') {
        return cloneElement(element as ReactElement<Record<string, unknown>>, {
          'data-surface-id': 'overview-dashboard',
          'data-state-id': 'overview-first-use',
        }, children);
      }
      const action = actions.get(text);
      if (!action || Children.toArray(element.props.children).some(isValidElement)) return undefined;
      if (!action.allowed) return cloneElement(element as ReactElement<Record<string, unknown>>, { 'aria-disabled': true, title: 'Ask a workspace administrator for access', href: undefined }, children);
      return <Link data-reference-tag={typeof element.type === 'string' ? element.type : 'a'} href={action.href} style={element.props.style as CSSProperties}>{children}</Link>;
    },
  });
}
