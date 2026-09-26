import { cloneElement, type ReactElement } from 'react';
import RootNotFoundVisual from '@/components/visual-authority/generated/Root-Not-Found-Clean';
import { PublicNotFoundBoundary } from '@/components/public/PublicNotFoundBoundary';

export default function NotFound() {
  return <PublicNotFoundBoundary fallback={cloneElement(RootNotFoundVisual() as ReactElement<Record<string, unknown>>, {
    'data-surface-id': 'root-not-found',
    'data-state-id': 'root-not-found',
    'data-route-presentation': 'not-found',
    'data-unauth-ui': 'supplied-package',
  })}/>;
}
