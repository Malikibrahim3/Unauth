/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';
import AccountDangerSection from '@/components/settings/AccountDangerSection';
import AccountPasswordSection from '@/components/settings/AccountPasswordSection';
import AccountProfileSection from '@/components/settings/AccountProfileSection';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import {
  initialAccountSettingsState,
  type AccountSettingsAction,
  type AccountSettingsState,
} from '@/components/settings/accountSettingsReducer';
import { SettingsNav, type SettingsNavGroup } from '@/components/settings/SettingsNav';
import { Surface } from '@/components/ui';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

import SettingsRedirectPage from '@/app/(app)/settings/page';
import { redirect } from 'next/navigation';

const mockRedirect = jest.mocked(redirect);

const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/settings/account', label: 'Workspace & account' },
      { href: '/settings/team', label: 'Team' },
      { href: '/settings/platform', label: 'Defaults' },
    ],
  },
  {
    label: 'Data & access',
    items: [
      { href: '/settings/api-integrations', label: 'API access' },
      { href: '/integrations', label: 'Connected apps' },
      { href: '/settings/data-privacy', label: 'Data & privacy' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/settings/notifications', label: 'Notifications' },
      { href: '/settings/audit-trail', label: 'Audit trail' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/settings/billing', label: 'Billing' },
      { href: '/settings/agreements', label: 'Agreements' },
    ],
  },
];

const state: AccountSettingsState = {
  ...initialAccountSettingsState,
  merchant: {
    id: 'merchant-1',
    name: 'Northstar Goods',
    monthly_order_volume: '100-500',
    primary_fraud_concern: 'returns',
    setup_complete: true,
  },
  storeName: 'Northstar Goods',
  userEmail: 'owner@example.test',
};

const dispatch = jest.fn<void, [AccountSettingsAction]>();

describe('Phase 21 core settings anatomy', () => {
  it('keeps the specified grouped navigation visible and identifies the current route', () => {
    render(<SettingsNav groups={SETTINGS_GROUPS} currentPath="/settings/billing" />);

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Data & access')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Connected apps' })).toHaveAttribute('href', '/integrations');
  });

  it('uses one working surface with joined account sections and an isolated destructive action', () => {
    const { container } = render(
      <Surface structure="working">
        <AccountProfileSection state={state} dispatch={dispatch} onSave={jest.fn()} />
        <AppearanceSettings />
        <AccountPasswordSection state={state} dispatch={dispatch} onSubmit={jest.fn()} />
        <AccountDangerSection state={state} dispatch={dispatch} onDelete={jest.fn()} />
      </Surface>,
    );

    expect(container.querySelector('.ua-working-surface')).toBeInTheDocument();
    expect(container.querySelectorAll('.ua-section-card--joined')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled();
  });

  it('redirects the settings root directly to the account form', async () => {
    await SettingsRedirectPage({ searchParams: Promise.resolve({}) });

    expect(mockRedirect).toHaveBeenCalledWith('/settings/account');
  });

  it('acknowledges a plan action at the initiating control', async () => {
    const fetchMock = jest.fn();
    Object.assign(global, { fetch: fetchMock });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
        planId: 'free',
        planName: 'Free',
        priceGbp: 0,
        status: 'active',
        monthlyCreditsRemaining: 10,
        topupCreditsRemaining: 0,
        monthlyAllowance: 10,
        totalRemaining: 10,
        usedThisCycle: 0,
        cycleResetAt: '2026-08-01T00:00:00.000Z',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        downgradeToPlanId: null,
        downgradeToPlanName: null,
        gracePeriodDaysRemaining: null,
        canTopUp: false,
        }),
      } as Response)
      .mockImplementationOnce(() => new Promise<Response>(() => {}));

    render(<BillingSettingsClient />);

    const upgrade = await screen.findByRole('button', { name: /upgrade to pro/i });
    fireEvent.click(upgrade);

    expect(await screen.findByRole('button', { name: 'Working…' })).toBeDisabled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/billing/actions',
      expect.objectContaining({ method: 'POST' }),
    );

  });
});
