/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ConnectorSetupNotice, ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { ShopifyIntegrationBannerInner } from '@/components/shopify/ShopifyIntegrationBannerInner';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
}));

describe('Phase 18 connector setup anatomy', () => {
  it('uses one labelled setup sequence and contextual provider requirements', () => {
    render(
      <ConnectorSetupShell provider="Freshdesk" requirements="An API key with ticket access is required.">
        <form aria-label="Freshdesk credentials"><button type="submit">Connect Freshdesk</button></form>
      </ConnectorSetupShell>,
    );

    expect(screen.getByText('Freshdesk connection')).toBeInTheDocument();
    expect(screen.getByText('An API key with ticket access is required.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Freshdesk setup progress' })).toHaveTextContent('Requirements');
    expect(screen.getByRole('list', { name: 'Freshdesk setup progress' })).toHaveTextContent('Verify');
    expect(screen.getByRole('button', { name: 'Connect Freshdesk' })).toBeInTheDocument();
  });

  it('announces connection failures as alerts with the critical semantic tone', () => {
    render(<ConnectorSetupNotice tone="error">Connection verification failed.</ConnectorSetupNotice>);

    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent('Connection verification failed.');
    expect(notice.getAttribute('style')).toContain('background: var(--ua-critical-bg)');
    expect(notice.getAttribute('style')).toContain('border-color: var(--ua-critical-border)');
    expect(notice.getAttribute('style')).toContain('color: var(--ua-critical)');
  });

  it('does not present a failed Shopify authorization as a successful connection', () => {
    render(<ShopifyIntegrationBannerInner search="shopify_error=invalid_hmac" />);

    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent('could not be verified');
    expect(notice.getAttribute('style')).toContain('background: var(--ua-critical-bg)');
    expect(notice.getAttribute('style')).toContain('color: var(--ua-critical)');
  });
});
