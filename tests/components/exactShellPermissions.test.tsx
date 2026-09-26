/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExactAuthenticatedShell } from '@/components/layout/ExactAuthenticatedShell';
import { PERMISSIONS } from '@/lib/permissions/constants';
import { BreadcrumbOverrideProvider } from '@/components/layout/BreadcrumbOverrideContext';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import FirstRunSource from '@/components/visual-authority/generated/First-Run-Clean';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/orders/live-order',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/relationships/ConnectedObjectDetail', () => ({ safeInternalReturn: (href?: string) => href?.startsWith('/') && !href.startsWith('//') ? href : null }));

it('opens search from the supplied first-run Search control by click and keyboard', () => {
  render(<ExactAuthenticatedShell pathname="/overview" sourcePageOverride={FirstRunSource} workspaceName="Matcha" workspaces={[]} activeMerchantId="live" userName="Member" userRole="owner" permissions={[PERMISSIONS.VIEW_DASHBOARD]} sourceTone="neutral" sourceLabel="Nothing imported">Page</ExactAuthenticatedShell>);
  const search = screen.getByRole('button', { name: 'Search and navigate' });
  fireEvent.click(search);
  expect(screen.getByRole('dialog', { name: 'Search and navigate' })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.keyDown(search, { key: 'Enter' });
  expect(screen.getByRole('dialog', { name: 'Search and navigate' })).toBeInTheDocument();
});

it('uses canonical permissions inside the supplied navigation and live source-health text', () => {
  render(<ExactAuthenticatedShell pathname="/overview" workspaceName="Live merchant" reportingCurrency="USD" timezone="America/New_York" workspaces={[]} activeMerchantId="live" userName="Member" userRole="analyst" permissions={[PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_INBOX]} sourceTone="green" sourceLabel="Live source health">
    <button>Live page action</button>
  </ExactAuthenticatedShell>);
  const navigation = within(screen.getByRole('complementary', { name: 'Workspace navigation' }));
  expect(navigation.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/work');
  expect(navigation.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
  expect(navigation.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  expect(screen.getAllByText('Live source health').length).toBeGreaterThan(0);
  expect(screen.getByText('USD · America/New_York')).toBeInTheDocument();
  expect(screen.queryByText('as of 1 Sep 09:02 · 5 of 6 sources current')).not.toBeInTheDocument();
  expect(screen.queryByText('Gorgias last imported 3d ago')).not.toBeInTheDocument();
  expect(screen.queryByText('9 cases wait on helpdesk evidence. Figures below exclude it.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Live page action' })).toBeInTheDocument();
});

it('binds the supplied shell footer to the verified account identity and menu', async () => {
  render(<ExactAuthenticatedShell pathname="/overview" workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Avery Mercer" userEmail="avery@example.test" userRole="owner" permissions={[PERMISSIONS.VIEW_DASHBOARD]} sourceTone="green" sourceLabel="Live source health">Page</ExactAuthenticatedShell>);
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  const menu = within(await screen.findByRole('menu', { name: 'Account and session' }));
  expect(menu.getByText('Avery Mercer')).toBeInTheDocument();
  expect(menu.getByText('avery@example.test')).toBeInTheDocument();
  expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
});

it('uses the record-owned breadcrumb instead of the example order identity', () => {
  render(<BreadcrumbOverrideProvider><ExactAuthenticatedShell pathname="/orders/live-order" workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Member" userRole="owner" permissions={[PERMISSIONS.VIEW_CUSTOMERS]} sourceTone="green" sourceLabel="Live source health">
    <SetBreadcrumbLabel label="ORDER-LIVE-27" detail="Shopify · recorded 5 Sep" />
  </ExactAuthenticatedShell></BreadcrumbOverrideProvider>);
  expect(screen.getByText('ORDER-LIVE-27')).toBeInTheDocument();
  expect(screen.getByText('Shopify · recorded 5 Sep')).toBeInTheDocument();
  expect(screen.queryByText('#AS-88214')).not.toBeInTheDocument();
});

it.each(['/financials/recovery/new', '/controls/rules/recovery', '/financials/reports/records'])('does not mistake the literal route %s for a record ID', (pathname) => {
  render(<ExactAuthenticatedShell pathname={pathname} workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Member" userRole="owner" permissions={[]} sourceTone="green" sourceLabel="Live source health">Page</ExactAuthenticatedShell>);
  expect(screen.queryByText('Record', { exact: true })).not.toBeInTheDocument();
});

it('searches live records, keeps the route chrome, and opens the selected canonical record', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ coverage: 'complete', results: [
    { id: 'live-order', type: 'order', label: 'ORDER-LIVE-27', sublabel: 'Actual customer', href: '/orders/live-order', source: 'shopify' },
  ] }) });
  try {
    const { container } = render(<ExactAuthenticatedShell pathname="/overview" workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Member" userRole="owner" permissions={[PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_CUSTOMERS]} sourceTone="green" sourceLabel="Live source health"><button>Live page action</button></ExactAuthenticatedShell>);
    const shell = container.querySelector('[data-exact-source-shell]')?.getAttribute('data-exact-source-shell');
    screen.getByRole('button', { name: 'Live page action' }).focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(container.querySelector('[data-exact-source-shell]')).toHaveAttribute('data-exact-source-shell', shell);
    const dialog = within(screen.getByRole('dialog'));
    const input = dialog.getByRole('searchbox');
    expect(input).toHaveValue('');
    expect(dialog.queryByText(/Maya Cheng/)).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'LIVE' } });
    await waitFor(() => expect(dialog.getByRole('link', { name: /ORDER-LIVE-27/ })).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/search?q=LIVE&limit=20', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/orders/live-order');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live page action' })).toHaveFocus();
  } finally { global.fetch = originalFetch; }
});

it('shows search failure without retaining sample or previous results', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  try {
    render(<ExactAuthenticatedShell pathname="/overview" workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName=" " userRole="owner" permissions={[]} sourceTone="green" sourceLabel="Live source health">Page</ExactAuthenticatedShell>);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByRole('searchbox'), { target: { value: 'missing' } });
    await waitFor(() => expect(dialog.getByRole('status')).toHaveTextContent('Search unavailable'));
    expect(dialog.queryAllByRole('link')).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally { global.fetch = originalFetch; }
});

it('wires every icon rail destination and makes the padded sidebar row one link', () => {
  const { container } = render(<ExactAuthenticatedShell pathname="/sources/setup/shopify" workspaceName="Live merchant" workspaces={[]} activeMerchantId="live" userName="Member" userRole="owner" permissions={Object.values(PERMISSIONS)} sourceTone="neutral" sourceLabel="Not connected">Page</ExactAuthenticatedShell>);
  const rail = container.querySelector('[data-reference-shell]')!.firstElementChild!;
  for (const href of ['/overview', '/financials/reports', '/cases', '/sources/imports', '/controls/flows']) {
    expect(rail.querySelector(`a[href="${href}"]`)).not.toBeNull();
  }
  const navigation = within(screen.getByRole('complementary', { name: 'Workspace navigation' }));
  const work = navigation.getByRole('link', { name: 'Work' });
  expect(work.querySelector('svg')).not.toBeNull();
  expect(work.querySelector('a')).toBeNull();
  expect(work).toHaveStyle({ padding: '7px 10px' });
});

it('keeps the same complete workspace navigation, live counts and active section across route templates', () => {
  const props = { workspaceName: 'Live merchant', workspaces: [], activeMerchantId: 'live', userName: 'Member', userRole: 'owner', permissions: Object.values(PERMISSIONS), sourceTone: 'neutral' as const, sourceLabel: 'Not connected', workCount: 7, caseCount: 62, reconciliationCount: 19 };
  const { rerender } = render(<ExactAuthenticatedShell {...props} pathname="/overview">Page</ExactAuthenticatedShell>);
  const expected = ['/overview', '/work', '/cases', '/customers', '/financials/losses', '/financials/recovery', '/financials/reconciliation', '/financials/reports', '/controls/rules', '/controls/flows', '/sources/connected', '/sources/imports', '/notifications', '/settings/workspace/account', '/help'];
  for (const path of ['/overview', '/customers/customer-1', '/cases/case-1', '/orders/order-1', '/work', '/financials/recovery', '/sources/setup/shopify', '/settings/billing', '/help/article-1']) {
    rerender(<ExactAuthenticatedShell {...props} pathname={path}>Page</ExactAuthenticatedShell>);
    const nav = screen.getByRole('complementary', { name: 'Workspace navigation' });
    expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(expected);
    expect(within(nav).getByRole('link', { name: 'Work' })).toHaveTextContent('7');
    expect(within(nav).getByRole('link', { name: 'Cases' })).toHaveTextContent('62');
    expect(within(nav).getByRole('link', { name: 'Reconciliation' })).toHaveTextContent('19');
    if (path.startsWith('/customers/')) expect(within(nav).getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]').length).toBeLessThanOrEqual(1);
  }
});
