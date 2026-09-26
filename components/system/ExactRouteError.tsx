'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Route-Error-Clean';
import { useAuthenticatedShellPresentation } from '@/components/layout/BreadcrumbOverrideContext';

const ERROR_PRESENTATION = { kind: 'route-error' } as const;

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

function bindRetry(node: ReactNode, reset: () => void): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  const children = Children.map(node.props.children, (child) => bindRetry(child, reset));
  if (compactText(node) === 'Try again') {
    return cloneElement(node as ReactElement<Record<string, unknown>>, {
      role: 'button',
      tabIndex: 0,
      onClick: reset,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        reset();
      },
    }, children);
  }
  return cloneElement(node, {}, children);
}

export default function ExactRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useAuthenticatedShellPresentation(ERROR_PRESENTATION);
  const root = SuppliedVisualBody() as ReactElement<{ children?: ReactNode }>;
  const children = Children.toArray(root.props.children);
  const firstElement = children.findIndex(isValidElement);
  return <>{children.map((child, index) => bindRetry(
    index === firstElement && isValidElement(child)
      ? cloneElement(child as ReactElement<Record<string, unknown>>, {
          'data-surface-id': 'route-error-boundary',
          'data-state-id': 'overview-error',
        })
      : child,
    reset,
  ))}</>;
}
