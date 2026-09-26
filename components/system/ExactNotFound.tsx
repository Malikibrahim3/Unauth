'use client';

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Not-Found-Clean';
import { useAuthenticatedShellPresentation } from '@/components/layout/BreadcrumbOverrideContext';

const NOT_FOUND_PRESENTATION = { kind: 'not-found' } as const;

type Props = {
  stateId?: string;
  surfaceId?: string;
  returnHref?: string;
  'data-route-presentation'?: 'not-found';
};

function bindNotFoundNode(node: ReactNode, returnHref: string): ReactNode {
  if (!isValidElement<{ children?: ReactNode; href?: string }>(node)) return node;
  const children = Children.map(node.props.children, (child) => bindNotFoundNode(child, returnHref));
  if (node.type === 'a' && node.props.href === '/cases') {
    return cloneElement(node as ReactElement<Record<string, unknown>>, { href: returnHref }, children);
  }
  return cloneElement(node, {}, children);
}

export default function ExactNotFound({
  stateId = 'connected-record-not-found',
  surfaceId = stateId,
  returnHref = '/cases',
}: Props) {
  useAuthenticatedShellPresentation(NOT_FOUND_PRESENTATION);
  const root = SuppliedVisualBody() as ReactElement<{ children?: ReactNode }>;
  const children = Children.toArray(root.props.children);
  const firstElement = children.findIndex(isValidElement);
  return <>{children.map((child, index) => (
    index === firstElement && isValidElement(child)
      ? bindNotFoundNode(cloneElement(child as ReactElement<Record<string, unknown>>, {
          'data-state-id': stateId,
          'data-surface-id': surfaceId,
          'data-route-presentation': 'not-found',
        }), returnHref)
      : bindNotFoundNode(child, returnHref)
  ))}</>;
}
