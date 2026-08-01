/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import OnboardingClient from '@/components/OnboardingClient';
import { AuthError } from '@/app/(auth)/AuthShell';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized: _unoptimized, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean }) => <img alt="" {...props} />,
}));

describe('Phase 24 entry and onboarding', () => {
  it('reserves inline error space and announces a newly supplied auth error', () => {
    const { rerender } = render(<AuthError id="email-error" />);
    const error = document.getElementById('email-error');
    expect(error).toHaveClass('min-h-5');
    expect(error).toHaveAttribute('aria-hidden', 'true');

    rerender(<AuthError id="email-error">Enter a valid email address.</AuthError>);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
  });

  it('uses completed work, not the active form, for onboarding progress and validates fields inline', () => {
    render(
      <OnboardingClient
        userId="user-1"
        initialStoreName=""
        initialPlatform=""
        initialAnnualVolume=""
        initialPrimaryConcern=""
        initialUsesWms3pl=""
        initialUsesReturnsPlatform=""
        initialProfileComplete={false}
        shopifyConnected={false}
        helpdeskConnected={false}
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toHaveAttribute('aria-valuenow', '0');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Review the highlighted fields before continuing.')).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Store name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Platform')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter your store name.')).toBeInTheDocument();
    expect(screen.getByText('Choose your platform.')).toBeInTheDocument();
  });
});
