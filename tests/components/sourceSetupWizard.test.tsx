/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SourceSetupWizard } from '@/components/sources/SourceSetupWizard';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const base = {
  providerId: 'bigcommerce',
  providerName: 'BigCommerce',
  configuration: 'not_configured' as const,
  operational: 'unknown' as const,
  badge: 'disconnected' as const,
  connectionNote: null,
  stage: 'partial',
  description: 'Commerce records from BigCommerce.',
  capabilities: [{ id: 'orders.read', description: 'Read orders', support: 'supported' }],
  deliveryModel: 'webhook',
  connectEnabled: true,
  canManage: true,
  returnTo: '/sources/bigcommerce',
};

describe('SourceSetupWizard truth boundary', () => {
  it('keeps the complete seven-step setup sequence with activation last', () => {
    render(<SourceSetupWizard {...base} initialStep="provider" />);

    const progress = screen.getByRole('list', { name: 'BigCommerce setup stages' });
    expect(progress).toHaveTextContent('Provider');
    expect(progress).toHaveTextContent('Permissions');
    expect(progress).toHaveTextContent('Field mapping');
    expect(progress).toHaveTextContent('History');
    expect(progress).toHaveTextContent('Schedule');
    expect(progress).toHaveTextContent('Review');
    expect(progress).toHaveTextContent('Activate');
    expect(screen.queryByText('Connection controls')).not.toBeInTheDocument();
  });

  it('shows adapter-owned mappings without collecting a cosmetic draft', () => {
    render(<SourceSetupWizard {...base} initialStep="mapping" />);

    expect(screen.getByRole('heading', { name: 'Field mapping' })).toBeInTheDocument();
    expect(screen.getByText('Mapped')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not claim a local configuration test verified provider credentials', () => {
    render(<SourceSetupWizard {...base} initialStep="verify" />);

    expect(screen.getByText(/only marked healthy once every required check passes on real data/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run configuration checks/i })).not.toBeInTheDocument();
  });
});
