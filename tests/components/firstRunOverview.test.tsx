/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FirstRunOverview } from '@/components/dashboard/FirstRunOverview';
import { PERMISSIONS } from '@/lib/permissions/constants';

jest.mock('@/components/navigation/AppNavLink', () => ({ __esModule: true, default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }));

it('uses the supplied first-run content with current identity and working canonical setup links', () => {
  render(<FirstRunOverview workspaceName="Live merchant" permissions={[PERMISSIONS.VIEW_SETTINGS, PERMISSIONS.MANAGE_SETTINGS]} />);
  expect(screen.getByText('Three connections and Live merchant can tell you what your losses cost')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Connect Shopify' })).toHaveAttribute('href', '/sources/setup/shopify');
  expect(screen.getByRole('link', { name: 'Upload a file' })).toHaveAttribute('href', '/sources/imports');
  expect(screen.getByText('NOT YOUR DATA')).toBeInTheDocument();
  expect(screen.queryByText('200–400')).not.toBeInTheDocument();
});

it('does not expose setup or import navigation without the required permissions', () => {
  render(<FirstRunOverview workspaceName="Live merchant" permissions={[]} />);
  expect(screen.queryByRole('link', { name: 'Connect Shopify' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Upload a file' })).not.toBeInTheDocument();
  expect(screen.getByText('Connect Shopify').closest('[aria-disabled="true"]')).toBeInTheDocument();
});
