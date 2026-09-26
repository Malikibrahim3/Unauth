/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnboardingClient from '@/components/OnboardingClient';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('onboarding deferral', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it('records an explicit deferral before opening the derived next task', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ onboardingDeferred: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(
      <OnboardingClient
        userId="user-1"
        workspaceHref="/overview"
        initialProfileComplete
        shopifyConnected
        nextAction={{ label: 'Review held import rows', href: '/sources/imports' }}
        acceptanceScenarioId="workspace-onboarding-deferral"
      />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Review held import rows' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/account/setup', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ deferOnboarding: true }),
    }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/sources/imports'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('saves the displayed monthly range and loss concern without substituting unrelated legacy values', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as typeof fetch;
    render(<OnboardingClient userId="user-1" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Store or business name' }), { target: { value: 'Actual store' } });
    for (const name of ['Shopify', 'Under 1,000', 'Damage', 'Neither']) fireEvent.click(screen.getByRole('button', { name, exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(expect.objectContaining({
      storeName: 'Actual store', monthlyOrderVolume: 'under_1000', primaryLossConcern: 'damage', usesWms3pl: false, usesReturnsPlatform: false,
    }));
  });
});
