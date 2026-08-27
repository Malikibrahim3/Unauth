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

  it('records an explicit deferral before entering the workspace', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ onboardingDeferred: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<OnboardingClient userId="user-1" workspaceHref="/overview" />);

    expect(screen.getByText(/Setup is recommended/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Skip for now/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/account/setup', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ deferOnboarding: true }),
    }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/overview'));
    expect(mockRefresh).toHaveBeenCalled();
  });
});
