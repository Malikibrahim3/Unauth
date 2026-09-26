/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExactAuthenticatedShell } from '@/components/layout/ExactAuthenticatedShell';
import Customer from '@/components/visual-authority/generated/Customer-Detail-Clean';
import Evidence from '@/components/visual-authority/generated/Evidence-Package-Clean';
import Repair from '@/components/visual-authority/generated/Source-Repair-Clean';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/overview', useSearchParams: () => new URLSearchParams() }));

it.each([
  ['/customers/local-customer', Customer],
  ['/customers/local-customer/evidence/new', Evidence],
  ['/sources/local-source?tab=repair', Repair],
] as const)('discards immutable reference body and overlay text at %s', (pathname, source) => {
  render(<ExactAuthenticatedShell pathname={pathname} sourcePageOverride={source} workspaceName="Synthetic workspace" workspaces={[]} activeMerchantId="local" userName="Local fixture" userRole="owner" permissions={[]} sourceTone="neutral" sourceLabel="Source coverage unavailable"><div>Actual route content</div></ExactAuthenticatedShell>);
  expect(screen.getByText('Actual route content')).toBeInTheDocument();
  expect(screen.queryByText(/claim history/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Dry-run the last 72 hours/)).not.toBeInTheDocument();
});
it('does not display example customer-history text in the opened palette', () => {
  render(<ExactAuthenticatedShell pathname="/overview" workspaceName="Synthetic workspace" workspaces={[]} activeMerchantId="local" userName="Local fixture" userRole="owner" permissions={[]} sourceTone="neutral" sourceLabel="Source coverage unavailable">Actual route content</ExactAuthenticatedShell>);
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
  expect(screen.getByRole('dialog', { name: 'Search and navigate' })).toBeInTheDocument();
  expect(screen.queryByText(/Open the customer’s claim history/)).not.toBeInTheDocument();
});
