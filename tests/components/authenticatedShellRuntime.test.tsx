/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthenticatedDesignShell from '@/components/layout/AuthenticatedDesignShell';

let pathname = '/financials/recovery/new';
let query = '';
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(query),
}));
jest.mock('@/components/layout/BreadcrumbOverrideContext', () => ({
  useAuthenticatedShellPresentationOverride: () => null,
}));
jest.mock('@/components/layout/ExactAuthenticatedShell', () => ({
  ExactAuthenticatedShell: ({ children, sourcePageOverrideUsesSourceBody }: { children: React.ReactNode; sourcePageOverrideUsesSourceBody: boolean }) =>
    <div data-testid="shell" data-static-body={String(Boolean(sourcePageOverrideUsesSourceBody))}>{children}</div>,
}));

it.each([
  ['/financials/recovery/new', 'case=live-case'],
  ['/financials/reports/records', ''],
  ['/controls/rules/live-rule', ''],
  ['/financials/losses/live-loss', 'action=write-off'],
  ['/financials/reconciliation', 'action=close'],
  ['/sources/live-source', 'tab=repair'],
  ['/sources/imports/live-import', 'step=mapping'],
  ['/overview', '__visual=first-run'],
  ['/overview', '__visual=command-palette'],
  ['/customers', '__visual=loading-registry'],
])('preserves the runtime page and handlers on %s', (path, search) => {
  pathname = path;
  query = search;
  render(<AuthenticatedDesignShell workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Member" userEmail="member@example.test" userRole="owner" permissions={[]} sourceTone="green" sourceLabel="Sources current">
    <button>Runtime action</button>
  </AuthenticatedDesignShell>);
  expect(screen.getByTestId('shell')).toHaveAttribute('data-static-body', 'false');
  expect(screen.getByRole('button', { name: 'Runtime action' })).toBeInTheDocument();
});
