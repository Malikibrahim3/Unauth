/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { HandoffSettingsNav } from '@/components/settings/HandoffSettingsNav';
import { SettingsAccessProvider } from '@/components/settings/SettingsAccessContext';
import { PERMISSIONS } from '@/lib/permissions/constants';

jest.mock('next/navigation', () => ({usePathname: () => '/settings/product/platform'}));

describe('supplied settings navigation', () => {
  it('keeps the supplied settings navigation frame while separating inbox from preferences', () => {
    render(<SettingsAccessProvider permissions={Object.values(PERMISSIONS)}><HandoffSettingsNav workspaceName="Asterlane" workspaceCreatedLabel="created 4 Feb 2026" /></SettingsAccessProvider>);
    expect(screen.getByRole('navigation', {name: 'Settings sections'})).toHaveStyle({ width: '186px', borderRadius: '13px' });
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/settings/workspace/account');
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/notifications');
    expect(screen.getByRole('link', { name: 'Notification preferences' })).toHaveAttribute('href', '/settings/product/notifications');
  });

  it('keeps unauthorized destinations out of the rendered navigation', () => {
    render(<SettingsAccessProvider permissions={[PERMISSIONS.VIEW_SETTINGS]}><HandoffSettingsNav workspaceName="Runtime workspace" /></SettingsAccessProvider>);
    expect(screen.getByRole('link', {name: 'Account'})).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'Team and roles'})).not.toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'API access'})).not.toBeInTheDocument();
    expect(screen.getByText('Runtime workspace')).toBeInTheDocument();
    expect(screen.queryByText(/Asterlane/)).not.toBeInTheDocument();
  });
});
