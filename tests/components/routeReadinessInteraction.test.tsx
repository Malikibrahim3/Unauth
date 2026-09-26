/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouteReadinessBoundary } from '@/components/system/RouteReadinessBoundary';
import { FirstRunOverview } from '@/components/dashboard/FirstRunOverview';
import { PERMISSIONS } from '@/lib/permissions/constants';

jest.mock('next/navigation', () => ({ usePathname: () => '/overview', useSearchParams: () => new URLSearchParams() }));
jest.mock('@/components/navigation/AppNavLink', () => ({ __esModule: true, default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }));
jest.mock('@/lib/react/useFetchJson', () => ({ pendingResourceCount: () => 0, subscribeToPendingResources: () => () => {} }));

afterEach(() => jest.useRealTimers());

it('keeps navigation usable when a route has no readiness marker, including after timeout', () => {
  jest.useFakeTimers();
  const click = jest.fn();
  const { container } = render(<RouteReadinessBoundary><button onClick={click}>Navigate</button></RouteReadinessBoundary>);
  expect(container.querySelector('[inert]')).toBeNull();
  act(() => jest.advanceTimersByTime(15_000));
  expect(container.querySelector('[data-route-state]')).toHaveAttribute('data-route-state', 'timeout');
  expect(container.querySelector('[inert]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(click).toHaveBeenCalledTimes(1);
});

it('recognises the actual first-run tree as an empty terminal state without disabling its setup links', () => {
  jest.useFakeTimers();
  const { container } = render(<RouteReadinessBoundary><FirstRunOverview workspaceName="Matcha" permissions={[PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_SETTINGS]} /></RouteReadinessBoundary>);
  act(() => jest.advanceTimersByTime(0));
  expect(container.querySelector('[data-requested-path]')).toHaveAttribute('data-route-state', 'empty');
  expect(container.querySelector('[inert]')).toBeNull();
  expect(screen.getByRole('link', { name: 'Connect Shopify' })).toHaveAttribute('href', '/sources/setup/shopify');
});
