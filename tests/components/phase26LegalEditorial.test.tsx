/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DataHandlingPage, { metadata as dataHandlingMetadata } from '@/app/(public)/legal/data-handling/page';
import DpaPage, { metadata as dpaMetadata } from '@/app/(public)/legal/dpa/page';
import PilotTermsPage, { metadata as pilotTermsMetadata } from '@/app/(public)/legal/pilot-terms/page';
import PrivacyPage, { metadata as privacyMetadata } from '@/app/(public)/legal/privacy/page';
import LegalNotFound from '@/app/(public)/legal/not-found';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized: _unoptimized, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean }) => <img alt="" {...props} />,
}));

describe('Phase 26 legal and editorial routes', () => {
  it.each([
    ['data handling', <DataHandlingPage key="data-handling" />, 'How Unauth handles your data', '/legal/data-handling'],
    ['DPA', <DpaPage key="dpa" />, 'Data Processing Agreement', '/legal/dpa'],
    ['pilot terms', <PilotTermsPage key="pilot-terms" />, 'Pilot terms', '/legal/pilot-terms'],
    ['privacy', <PrivacyPage key="privacy" />, 'Privacy Policy', '/legal/privacy'],
  ])('renders the %s document with consistent public navigation', (_name, page, heading, pathname) => {
    render(page);

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to document' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('navigation', { name: 'Legal documents' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', pathname);
    expect(screen.getByRole('navigation', { name: 'Related legal documents' })).toBeInTheDocument();
  });

  it('keeps the existing document content navigable by explicit heading anchors', () => {
    const { container } = render(<DpaPage />);

    expect(screen.getByRole('heading', { level: 2, name: /obligations of the processor/i }).closest('section')).toHaveAttribute('id', 'processor-obligations');
    expect(screen.getByRole('link', { name: 'Processor obligations' })).toHaveAttribute('href', '#processor-obligations');
    expect(screen.getByText(/HMAC-SHA256 hashing of customer identifiers/i)).toBeInTheDocument();
    expect(container.querySelector('main')).not.toHaveClass('ua-app');
  });

  it('provides descriptive metadata without changing the approved legal language', () => {
    expect(dataHandlingMetadata.description).toContain('merchant and customer data');
    expect(dpaMetadata.description).toContain('legal and procurement review');
    expect(pilotTermsMetadata.description).toBe('Terms for founding-merchant pilot access.');
    expect(privacyMetadata.description).toContain('merchant, customer, and platform data');
  });

  it('keeps unknown legal URLs out of the authenticated product shell', () => {
    render(<LegalNotFound />);

    expect(screen.getByRole('heading', { level: 1, name: 'Legal page not found' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('ua-app');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/legal/privacy');
  });
});
